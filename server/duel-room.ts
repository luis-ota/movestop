import {
  ACTIONS,
  DUEL_RULES,
  DUEL_ROUNDS_TO_WIN,
  DUEL_TICK_MS,
  buildDuelGrid,
  duelColliders,
  spawnPoint,
  type DuelBulletSnapshot,
  type DuelRoundState,
  type DuelSnapshot,
  type ServerMessage,
} from '../src/shared/duel';

/**
 * The room only needs these two socket operations. Keeping the dependency
 * structural makes the simulation testable without Bun's WebSocket types and
 * lets server/index.ts attach extra per-connection data.
 */
export interface RoomSocket {
  send(data: string): unknown;
  close(code?: number, reason?: string): void;
}

export interface ServerPlayer {
  id: string;
  side: 0 | 1;
  name: string;
  skin?: string;
  ws: RoomSocket;
  x: number;
  z: number;
  angle: number;
  vx: number;
  vz: number;
  hp: number;
  ammo: number;
  focus: number;
  alive: boolean;
  invuln: number;
  dashCd: number;
  dashTime: number;
  dashX: number;
  dashZ: number;
  parryCd: number;
  parryWindow: number;
  slashCd: number;
  specialCd: number;
  fireCd: number;
  lastInputSeq: number;
  lastActionId: number;
  move: [number, number];
  aim: [number, number];
  firing: boolean;
  actionBudget: number;
  lastActionAt: number;
  joinedAt: number;
}

export interface SocketData {
  room?: DuelRoom;
  playerId?: string;
  ip?: string;
}

interface Bullet {
  id: number;
  owner: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  angle: number;
  speed: number;
  life: number;
}

interface RoomOptions {
  code: string;
  onEmpty: (room: DuelRoom) => void;
  onClosed: (room: DuelRoom) => void;
}

const colliders = duelColliders();
const WALL_LIMIT_X = (buildDuelGrid()[0].length - 1) / 2 - 0.5;
const WALL_LIMIT_Z = (buildDuelGrid().length - 1) / 2 - 0.5;

function send(ws: RoomSocket, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* the close handler cleans up */
  }
}

function segmentPointDistance(
  x0: number,
  z0: number,
  dx: number,
  dz: number,
  px: number,
  pz: number,
): number {
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return Math.hypot(px - x0, pz - z0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (pz - z0) * dz) / len2));
  return Math.hypot(px - (x0 + dx * t), pz - (z0 + dz * t));
}

/**
 * The room owns every gameplay decision. Clients only provide normalized
 * movement/aim intents and edge-triggered action ids; positions, cooldowns,
 * ammo, damage, parry windows, rounds and the match result never come from a
 * client packet.
 */
export class DuelRoom {
  readonly code: string;
  players: ServerPlayer[] = [];
  state: DuelRoundState = 'waiting';
  stateTimer = 0;
  round = 1;
  score: [number, number] = [0, 0];
  lastWinner: string | null = null;
  matchWinner: string | null = null;
  timeScale = 0.04;
  tick = 0;
  private bullets: Bullet[] = [];
  private nextBulletId = 1;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onEmpty: (room: DuelRoom) => void;
  private onClosed: (room: DuelRoom) => void;
  private closed = false;
  private lastSnapshotAt = 0;
  private timePulse = 0;

  constructor(options: RoomOptions) {
    this.code = options.code;
    this.onEmpty = options.onEmpty;
    this.onClosed = options.onClosed;
    this.timer = setInterval(() => this.tickRoom(), DUEL_TICK_MS);
  }

  get isFull(): boolean {
    return this.players.length >= 2;
  }

  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  /** Returns false when the room is closed or already has two players. */
  join(player: ServerPlayer): boolean {
    if (this.closed || this.players.length >= 2) return false;
    this.players.push(player);
    send(player.ws, {
      t: 'welcome',
      id: player.id,
      room: this.code,
      side: player.side,
      name: player.name,
    });
    send(player.ws, { t: 'queue', room: this.code, players: this.players.length });
    if (this.players.length === 2) this.beginMatch();
    else this.broadcastQueue();
    return true;
  }

  leave(playerId: string): void {
    if (this.closed) return;
    const index = this.players.findIndex((p) => p.id === playerId);
    if (index === -1) return;
    const [leaving] = this.players.splice(index, 1);
    if (this.players.length > 0) {
      const remaining = this.players[0];
      this.matchWinner = remaining.id;
      this.state = 'matchEnd';
      // Keep the result on screen briefly, then close instead of queueing the
      // winner for a new opponent (the match is already decided).
      this.stateTimer = 4;
      this.broadcast({ t: 'end', winner: remaining.id, score: this.score, reason: 'oponente saiu' });
      this.broadcastSnapshot(true);
    }
    if (leaving) {
      try {
        leaving.ws.close(1000, 'left');
      } catch {
        /* already closed */
      }
    }
    if (this.isEmpty) this.close();
    else if (this.state === 'waiting') this.broadcastQueue();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const p of this.players) {
      try {
        p.ws.close(1000, 'room closed');
      } catch {
        /* already closed */
      }
    }
    this.players = [];
    this.bullets = [];
    this.onEmpty(this);
    this.onClosed(this);
  }

  private broadcastQueue(): void {
    for (const p of this.players) send(p.ws, { t: 'queue', room: this.code, players: this.players.length });
  }

  private beginMatch(): void {
    for (const p of this.players) {
      const spawn = spawnPoint(p.side);
      p.x = spawn.x;
      p.z = spawn.z;
      p.vx = 0;
      p.vz = 0;
      p.angle = p.side === 0 ? Math.PI / 2 : -Math.PI / 2;
      p.hp = 1;
      p.ammo = DUEL_RULES.spawnAmmo;
      p.focus = 0;
      p.alive = true;
      p.invuln = DUEL_RULES.spawnInvuln;
      p.dashCd = 0;
      p.dashTime = 0;
      p.parryCd = 0;
      p.parryWindow = 0;
      p.slashCd = 0;
      p.specialCd = 0;
      p.fireCd = 0;
      p.firing = false;
    }
    this.round = 1;
    this.score = [0, 0];
    this.lastWinner = null;
    this.matchWinner = null;
    this.bullets = [];
    this.state = 'countdown';
    this.stateTimer = DUEL_RULES.countdown;
    for (const p of this.players) {
      send(p.ws, {
        t: 'matched',
        room: this.code,
        side: p.side,
        opponent: this.players.find((o) => o !== p)?.name ?? 'Ronin',
        tick: DUEL_TICK_MS,
      });
    }
    this.broadcastSnapshot(true);
  }

  input(playerId: string, seq: number, move: [number, number], aim: [number, number]): void {
    const p = this.players.find((x) => x.id === playerId);
    if (!p || !Number.isFinite(seq) || seq <= p.lastInputSeq) return;
    // Defense in depth: server/index.ts rejects these before calling the room,
    // but a non-finite vector must never poison the simulation with NaN.
    if (
      !Number.isFinite(move[0]) ||
      !Number.isFinite(move[1]) ||
      !Number.isFinite(aim[0]) ||
      !Number.isFinite(aim[1])
    ) {
      return;
    }
    p.lastInputSeq = seq;
    const moveLen = Math.hypot(move[0], move[1]);
    if (moveLen > 1) {
      move[0] /= moveLen;
      move[1] /= moveLen;
    }
    p.move = [Math.max(-1, Math.min(1, move[0])), Math.max(-1, Math.min(1, move[1]))];
    const aimLen = Math.hypot(aim[0], aim[1]);
    if (aimLen > 0.01 && Number.isFinite(aimLen)) p.aim = [aim[0] / aimLen, aim[1] / aimLen];
  }

  action(playerId: string, actionId: number, mask: number): void {
    const p = this.players.find((x) => x.id === playerId);
    if (!p || !Number.isFinite(actionId) || actionId <= p.lastActionId) return;
    p.lastActionId = actionId;
    if (this.state !== 'live' || !p.alive) return;
    const now = Date.now();
    // hard budget: never more than 18 accepted actions per second per player
    if (now - p.lastActionAt < 50) return;
    p.lastActionAt = now;
    const safeMask = Number.isInteger(mask) ? mask & 31 : 0;
    if (safeMask & ACTIONS.shoot) this.shoot(p);
    if (safeMask & ACTIONS.parry) this.parry(p);
    if (safeMask & ACTIONS.dash) this.dash(p);
    if (safeMask & ACTIONS.slash) this.slash(p);
    if (safeMask & ACTIONS.special) this.special(p);
  }

  setFiring(playerId: string, firing: boolean): void {
    const p = this.players.find((x) => x.id === playerId);
    if (p) p.firing = firing;
  }

  ping(playerId: string, ts: unknown): void {
    const p = this.players.find((x) => x.id === playerId);
    if (p) send(p.ws, { t: 'pong', ts: typeof ts === 'number' ? ts : 0 });
  }

  private tickRoom(): void {
    if (this.closed) return;
    this.tick++;
    const now = Date.now();
    if (this.state === 'countdown') {
      this.stateTimer -= 1 / 30;
      if (this.stateTimer <= 0) {
        this.state = 'live';
        this.stateTimer = 0;
      }
    } else if (this.state === 'roundEnd') {
      this.stateTimer -= 1 / 30;
      if (this.stateTimer <= 0) this.nextRound();
    } else if (this.state === 'matchEnd') {
      this.stateTimer -= 1 / 30;
      if (this.stateTimer <= 0 && this.players.length > 0) {
        this.broadcast({ t: 'end', winner: this.matchWinner, score: this.score, reason: 'fim da partida' });
        this.close();
        return;
      }
    }

    if (this.state === 'live') this.simulate();
    if (now - this.lastSnapshotAt > 1000 / 60) {
      this.broadcastSnapshot(false);
      this.lastSnapshotAt = now;
    }
  }

  private simulate(): void {
    const dt = 1 / 30;
    const anyMove = this.players.some(
      (p) => p.alive && (Math.hypot(p.move[0], p.move[1]) > 0.12 || p.dashTime > 0),
    );
    this.timePulse = Math.max(0, this.timePulse - dt);
    const target = anyMove || this.timePulse > 0 ? 1 : 0.04;
    this.timeScale += (target - this.timeScale) * (1 - Math.exp(-9 * dt));
    const simDt = dt * this.timeScale;

    for (const p of this.players) {
      if (!p.alive) continue;
      p.invuln = Math.max(0, p.invuln - dt);
      p.fireCd = Math.max(0, p.fireCd - dt);
      p.dashCd = Math.max(0, p.dashCd - dt);
      p.parryCd = Math.max(0, p.parryCd - dt);
      p.parryWindow = Math.max(0, p.parryWindow - dt);
      p.slashCd = Math.max(0, p.slashCd - dt);
      p.specialCd = Math.max(0, p.specialCd - dt);

      if (p.dashTime > 0) {
        p.dashTime -= dt;
        p.vx = p.dashX * DUEL_RULES.dashSpeed;
        p.vz = p.dashZ * DUEL_RULES.dashSpeed;
      } else {
        p.vx += ((p.move[0] * DUEL_RULES.moveSpeed) - p.vx) * (1 - Math.exp(-14 * dt));
        p.vz += ((p.move[1] * DUEL_RULES.moveSpeed) - p.vz) * (1 - Math.exp(-14 * dt));
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      this.collide(p);
      p.angle = Math.atan2(p.aim[0], p.aim[1]);
      if (p.firing) this.shoot(p);
    }

    // bullets advance only when the shared world advances
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life -= simDt;
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      const nx = b.x + b.vx * simDt;
      const nz = b.z + b.vz * simDt;
      let blocked = false;
      for (const c of colliders) {
        if (nx > c.minX - 0.05 && nx < c.maxX + 0.05 && nz > c.minZ - 0.05 && nz < c.maxZ + 0.05) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        this.bullets.splice(i, 1);
        continue;
      }
      b.x = nx;
      b.z = nz;
      const target = this.players.find((p) => p.alive && p.id !== b.owner);
      if (!target) continue;
      if (Math.hypot(target.x - b.x, target.z - b.z) < 0.38 && target.invuln <= 0) {
        if (target.parryWindow > 0) {
          const angle = Math.atan2(b.x - target.x, b.z - target.z);
          b.vx = Math.sin(angle) * DUEL_RULES.bulletSpeed;
          b.vz = Math.cos(angle) * DUEL_RULES.bulletSpeed;
          b.owner = target.id;
          b.angle = angle;
          b.life = 2.4;
          target.focus = Math.min(DUEL_RULES.focusMax, target.focus + DUEL_RULES.focusParry);
          this.broadcast({ t: 'event', kind: 'parry', who: target.id, x: target.x, z: target.z });
          continue;
        }
        this.hit(target, b.owner);
        this.bullets.splice(i, 1);
      }
    }
  }

  private blockedAt(x: number, z: number): boolean {
    const r = 0.3;
    if (Math.abs(x) > WALL_LIMIT_X - 0.01 || Math.abs(z) > WALL_LIMIT_Z - 0.01) return true;
    for (const c of colliders) {
      const cx = Math.max(c.minX, Math.min(c.maxX, x));
      const cz = Math.max(c.minZ, Math.min(c.maxZ, z));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  private collide(p: ServerPlayer): void {
    const r = 0.3;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of colliders) {
        const cx = Math.max(c.minX, Math.min(c.maxX, p.x));
        const cz = Math.max(c.minZ, Math.min(c.maxZ, p.z));
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          if (d2 > 1e-9) {
            const d = Math.sqrt(d2);
            const push = r - d;
            p.x += (dx / d) * push;
            p.z += (dz / d) * push;
          } else {
            p.x += r;
          }
        }
      }
    }
    p.x = Math.max(-WALL_LIMIT_X, Math.min(WALL_LIMIT_X, p.x));
    p.z = Math.max(-WALL_LIMIT_Z, Math.min(WALL_LIMIT_Z, p.z));
  }

  private shoot(p: ServerPlayer): void {
    if (!p.alive || p.fireCd > 0 || p.ammo <= 0) return;
    p.ammo--;
    p.fireCd = DUEL_RULES.fireCooldown;
    // Firing snaps the world to full speed for a moment so the shot can resolve.
    this.timePulse = Math.max(this.timePulse, 0.8);
    this.timeScale = 1;
    const a = Math.atan2(p.aim[0], p.aim[1]);
    const sx = p.x + Math.sin(a) * 0.55;
    const sz = p.z + Math.cos(a) * 0.55;
    this.bullets.push({
      id: this.nextBulletId++,
      owner: p.id,
      x: sx,
      z: sz,
      vx: Math.sin(a) * DUEL_RULES.bulletSpeed,
      vz: Math.cos(a) * DUEL_RULES.bulletSpeed,
      angle: a,
      speed: DUEL_RULES.bulletSpeed,
      life: DUEL_RULES.bulletLife,
    });
    this.broadcast({ t: 'event', kind: 'shot', who: p.id, x: sx, z: sz, angle: a });
  }

  private parry(p: ServerPlayer): void {
    if (!p.alive || p.parryCd > 0) return;
    p.parryCd = DUEL_RULES.parryCooldown;
    p.parryWindow = DUEL_RULES.parryWindow;
    // bullets already inside the radius are reflected immediately
    for (const b of this.bullets) {
      if (b.owner === p.id) continue;
      if (Math.hypot(b.x - p.x, b.z - p.z) <= DUEL_RULES.parryRadius) {
        const angle = Math.atan2(b.x - p.x, b.z - p.z);
        b.vx = Math.sin(angle) * DUEL_RULES.bulletSpeed;
        b.vz = Math.cos(angle) * DUEL_RULES.bulletSpeed;
        b.owner = p.id;
        b.angle = angle;
        b.life = 2.4;
        p.focus = Math.min(DUEL_RULES.focusMax, p.focus + DUEL_RULES.focusParry);
        this.broadcast({ t: 'event', kind: 'parry', who: p.id, x: p.x, z: p.z });
      }
    }
  }

  private dash(p: ServerPlayer): void {
    if (!p.alive || p.dashCd > 0) return;
    const len = Math.hypot(p.move[0], p.move[1]);
    const dx = len > 0.1 ? p.move[0] / len : p.aim[0];
    const dz = len > 0.1 ? p.move[1] / len : p.aim[1];
    p.dashTime = DUEL_RULES.dashTime;
    p.dashX = dx;
    p.dashZ = dz;
    p.dashCd = DUEL_RULES.dashCooldown;
    p.invuln = Math.max(p.invuln, DUEL_RULES.dashInvuln);
    this.broadcast({ t: 'event', kind: 'dash', who: p.id, x: p.x, z: p.z, angle: Math.atan2(dx, dz) });
  }

  private slash(p: ServerPlayer): void {
    if (!p.alive || p.slashCd > 0) return;
    p.slashCd = DUEL_RULES.slashCooldown;
    const angle = Math.atan2(p.aim[0], p.aim[1]);
    const enemy = this.players.find((o) => o.alive && o.id !== p.id);
    let hit = false;
    if (enemy) {
      const d = Math.hypot(enemy.x - p.x, enemy.z - p.z);
      const targetAngle = Math.atan2(enemy.x - p.x, enemy.z - p.z);
      const diff = Math.abs(Math.atan2(Math.sin(targetAngle - angle), Math.cos(targetAngle - angle)));
      if (d < DUEL_RULES.slashRange + 0.34 && diff < DUEL_RULES.slashArc) {
        this.hit(enemy, p.id);
        hit = true;
        p.focus = Math.min(DUEL_RULES.focusMax, p.focus + DUEL_RULES.focusSlash);
      }
    }
    for (const b of this.bullets) {
      if (b.owner === p.id) continue;
      if (Math.hypot(b.x - p.x, b.z - p.z) < DUEL_RULES.slashRange) {
        b.vx = Math.sin(angle) * DUEL_RULES.bulletSpeed;
        b.vz = Math.cos(angle) * DUEL_RULES.bulletSpeed;
        b.owner = p.id;
        b.angle = angle;
        b.life = 2.4;
      }
    }
    this.broadcast({ t: 'event', kind: 'slash', who: p.id, x: p.x, z: p.z, angle });
    if (hit) p.focus = Math.min(DUEL_RULES.focusMax, p.focus + 10);
  }

  private special(p: ServerPlayer): void {
    if (!p.alive || p.specialCd > 0) return;
    if (p.focus < DUEL_RULES.focusMax) return;
    p.focus = 0;
    p.specialCd = DUEL_RULES.specialCooldown;
    p.invuln = Math.max(p.invuln, 0.7);
    const angle = Math.atan2(p.aim[0], p.aim[1]);
    const fromX = p.x;
    const fromZ = p.z;
    const steps = 24;
    const stepLen = DUEL_RULES.specialRange / steps;
    for (let i = 0; i < steps; i++) {
      const nx = p.x + Math.sin(angle) * stepLen;
      const nz = p.z + Math.cos(angle) * stepLen;
      if (this.blockedAt(nx, nz)) break;
      p.x = nx;
      p.z = nz;
    }
    this.collide(p);
    const enemy = this.players.find((o) => o.alive && o.id !== p.id);
    if (enemy) {
      const d = segmentPointDistance(fromX, fromZ, p.x - fromX, p.z - fromZ, enemy.x, enemy.z);
      if (d < DUEL_RULES.specialLineWidth || Math.hypot(enemy.x - p.x, enemy.z - p.z) < 2.1) {
        this.hit(enemy, p.id);
      }
    }
    for (const b of this.bullets) {
      if (b.owner === p.id) continue;
      if (segmentPointDistance(fromX, fromZ, p.x - fromX, p.z - fromZ, b.x, b.z) < 1.6) {
        b.life = 0;
      }
    }
    this.broadcast({ t: 'event', kind: 'special', who: p.id, x: p.x, z: p.z, angle });
  }

  private hit(target: ServerPlayer, attackerId: string): void {
    if (!target.alive || target.invuln > 0) return;
    target.hp -= 1;
    target.alive = target.hp > 0;
    if (target.alive) {
      target.invuln = 0.8;
      this.broadcast({ t: 'event', kind: 'hit', who: attackerId, target: target.id, x: target.x, z: target.z });
      return;
    }
    const winner = this.players.find((p) => p.id === attackerId);
    if (winner) {
      this.score[winner.side] += 1;
      this.lastWinner = winner.id;
      winner.focus = Math.min(DUEL_RULES.focusMax, winner.focus + DUEL_RULES.focusHit);
    }
    this.broadcast({ t: 'event', kind: 'hit', who: attackerId, target: target.id, x: target.x, z: target.z });
    if (this.score[0] >= DUEL_ROUNDS_TO_WIN || this.score[1] >= DUEL_ROUNDS_TO_WIN) {
      this.state = 'matchEnd';
      this.stateTimer = 4;
      this.matchWinner = winner?.id ?? null;
      this.broadcast({ t: 'event', kind: 'match', who: this.matchWinner ?? '' });
      this.broadcast({ t: 'end', winner: this.matchWinner, score: this.score, reason: 'melhor de cinco' });
    } else {
      this.state = 'roundEnd';
      this.stateTimer = DUEL_RULES.roundDelay;
      this.round += 1;
      this.broadcast({ t: 'event', kind: 'round', who: attackerId });
    }
    this.broadcastSnapshot(true);
  }

  private nextRound(): void {
    this.bullets = [];
    for (const p of this.players) {
      const spawn = spawnPoint(p.side);
      p.x = spawn.x;
      p.z = spawn.z;
      p.vx = 0;
      p.vz = 0;
      p.hp = 1;
      p.ammo = DUEL_RULES.spawnAmmo;
      p.alive = true;
      p.invuln = DUEL_RULES.spawnInvuln;
      p.dashCd = 0;
      p.dashTime = 0;
      p.parryCd = 0;
      p.parryWindow = 0;
      p.slashCd = 0;
      p.specialCd = 0;
      p.fireCd = 0;
      p.focus = Math.min(DUEL_RULES.focusMax, p.focus + 20);
      p.angle = p.side === 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    this.state = 'countdown';
    this.stateTimer = DUEL_RULES.countdown;
    this.broadcast({ t: 'event', kind: 'spawn', who: '' });
    this.broadcastSnapshot(true);
  }

  private broadcast(msg: ServerMessage): void {
    for (const p of this.players) send(p.ws, msg);
  }

  private broadcastSnapshot(force: boolean): void {
    if (!force && this.players.length === 0) return;
    const snapshot: DuelSnapshot = {
      t: 'snapshot',
      tick: this.tick,
      serverTime: Date.now(),
      round: this.round,
      score: [...this.score] as [number, number],
      state: this.state,
      stateTimer: Math.max(0, this.stateTimer),
      timeScale: this.timeScale,
      lastWinner: this.lastWinner,
      matchWinner: this.matchWinner,
      players: this.players.map((p) => ({
        id: p.id,
        side: p.side,
        name: p.name,
        skin: p.skin ?? 'skin-ronin',
        x: p.x,
        z: p.z,
        angle: p.angle,
        hp: p.hp,
        ammo: p.ammo,
        focus: p.focus,
        alive: p.alive,
        invuln: p.invuln,
        dash: p.dashCd <= 0 ? 1 : Math.max(0, 1 - p.dashCd / DUEL_RULES.dashCooldown),
        parry: p.parryCd <= 0 ? 1 : Math.max(0, 1 - p.parryCd / DUEL_RULES.parryCooldown),
        firing: p.firing,
      })),
      bullets: this.bullets.map((b) => ({
        id: b.id,
        owner: b.owner,
        x: b.x,
        z: b.z,
        angle: b.angle,
        speed: b.speed,
        life: b.life,
      })),
    };
    this.broadcast(snapshot);
  }
}
