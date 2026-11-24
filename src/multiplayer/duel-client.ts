/**
 * DuelClient — browser-side transport for the authoritative 1v1 duel server.
 *
 * Trust model: this module only sends intents (join/leave, normalized move and
 * aim, edge-triggered actions, pings). It never decides positions, hits, ammo,
 * cooldowns, rounds or the winner. Those come exclusively from server snapshots
 * and events, and are treated as untrusted data at the boundary: every message
 * is shape-validated here before it reaches a callback.
 *
 * Lifecycle: the socket is opened lazily by connect()/quickMatch()/joinRoom()
 * (the constructor only stores configuration), and there is no automatic
 * reconnect. A close always clears every timer and moves the status to
 * 'closed'; call connect() again to start a new session.
 */

import {
  ACTIONS,
  clamp,
  isFinitePair,
  sanitizeName,
  type ActionName,
  type ClientMessage,
  type DuelBulletSnapshot,
  type DuelEvent,
  type DuelPlayerSnapshot,
  type DuelRoundState,
  type DuelSnapshot,
} from '../shared/duel';

export type DuelStatus = 'idle' | 'connecting' | 'connected' | 'queued' | 'matched' | 'closed' | 'error';

export interface DuelWelcomeInfo {
  id: string;
  room: string;
  side: 0 | 1;
}

export interface DuelMatchInfo {
  room: string;
  side: 0 | 1;
  opponent: string;
}

export interface DuelEndInfo {
  winner: string | null;
  score: [number, number];
  reason: string;
}

export interface DuelCallbacks {
  onStatus?: (status: DuelStatus, detail?: string) => void;
  onWelcome?: (msg: DuelWelcomeInfo) => void;
  onQueue?: (room: string) => void;
  onMatched?: (msg: DuelMatchInfo) => void;
  onSnapshot?: (snap: DuelSnapshot) => void;
  onEvent?: (evt: DuelEvent) => void;
  onEnd?: (msg: DuelEndInfo) => void;
  onError?: (code: string, message: string) => void;
  onPong?: (rtt: number) => void;
}

export interface DuelClientOptions {
  /** Input packets per second. Default 30 (2..60). */
  inputHz?: number;
  /** Ping period in milliseconds. Default 2000. */
  pingIntervalMs?: number;
  /** Period of shoot actions while setFiring(true). Default 200ms. */
  fireIntervalMs?: number;
  /** Minimum time between action packets. Default 64ms (~15.6/s). */
  actionIntervalMs?: number;
  /** Visual interpolation delay in milliseconds. Default 50ms. */
  interpolationDelayMs?: number;
}

interface BufferedSnapshot {
  snapshot: DuelSnapshot;
  /** performance.now() at which this snapshot was received locally. */
  receivedAt: number;
}

interface SnapshotFrame {
  from: BufferedSnapshot;
  to: BufferedSnapshot;
  alpha: number;
}

type UnknownRecord = Record<string, unknown>;

const MAX_PLAYERS = 8;
const MAX_BULLETS = 512;
const MAX_RTT_MS = 60_000;
const TAU = Math.PI * 2;

const ROUND_STATES: readonly DuelRoundState[] = ['waiting', 'countdown', 'live', 'roundEnd', 'matchEnd'];
const EVENT_KINDS = ['shot', 'hit', 'parry', 'slash', 'special', 'dash', 'round', 'spawn', 'match'] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isSide(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1;
}

function isRoundState(value: unknown): value is DuelRoundState {
  return typeof value === 'string' && (ROUND_STATES as readonly string[]).includes(value);
}

function isEventKind(value: unknown): value is DuelEvent['kind'] {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value);
}

function optionNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return clamp(value, min, max);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Interpolate angles along the shortest arc so a wrap at ±π does not spin the model. */
function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  else if (delta < -Math.PI) delta += TAU;
  return from + delta * t;
}

function safeCall<Args extends unknown[]>(fn: ((...args: Args) => void) | undefined, ...args: Args): void {
  if (!fn) return;
  try {
    fn(...args);
  } catch (error) {
    // A broken UI callback must never stop networking or message validation.
    console.error('[duel-client] callback failed', error);
  }
}

function parseWelcome(raw: UnknownRecord): DuelWelcomeInfo | null {
  const { id, room, side } = raw;
  if (!isString(id) || !isString(room) || !isSide(side)) return null;
  return { id, room, side };
}

function parseQueue(raw: UnknownRecord): string | null {
  const { room, players } = raw;
  if (!isString(room)) return null;
  if (players !== undefined && !isFiniteNumber(players)) return null;
  return room;
}

function parseMatched(raw: UnknownRecord): DuelMatchInfo | null {
  const { room, side, opponent } = raw;
  if (!isString(room) || !isSide(side) || !isString(opponent)) return null;
  return { room, side, opponent };
}

function parseEnd(raw: UnknownRecord): DuelEndInfo | null {
  const { winner, score, reason } = raw;
  let safeWinner: string | null;
  if (winner === null) safeWinner = null;
  else if (isString(winner)) safeWinner = winner;
  else return null;
  if (!isFinitePair(score) || !isString(reason)) return null;
  return { winner: safeWinner, score: [score[0], score[1]], reason };
}

function parseError(raw: UnknownRecord): { code: string; message: string } | null {
  const { code, message } = raw;
  if (!isString(code) || !isString(message)) return null;
  return { code, message };
}

function parsePong(raw: UnknownRecord): number | null {
  const { ts } = raw;
  return isFiniteNumber(ts) ? ts : null;
}

function parsePlayer(value: unknown): DuelPlayerSnapshot | null {
  if (!isRecord(value)) return null;
  const { id, side, name, skin, x, z, angle, hp, ammo, focus, alive, invuln, dash, parry, firing } = value;
  if (
    !isString(id) ||
    !isSide(side) ||
    !isString(name) ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(z) ||
    !isFiniteNumber(angle) ||
    !isFiniteNumber(hp) ||
    !isFiniteNumber(ammo) ||
    !isFiniteNumber(focus) ||
    typeof alive !== 'boolean' ||
    !isFiniteNumber(invuln) ||
    !isFiniteNumber(dash) ||
    !isFiniteNumber(parry) ||
    typeof firing !== 'boolean'
  ) {
    return null;
  }
  const safeSkin = typeof skin === 'string' && /^skin-[a-z0-9-]{1,32}$/.test(skin) ? skin : 'skin-ronin';
  return { id, side, name, skin: safeSkin, x, z, angle, hp, ammo, focus, alive, invuln, dash, parry, firing };
}

function parseBullet(value: unknown): DuelBulletSnapshot | null {
  if (!isRecord(value)) return null;
  const { id, owner, x, z, angle, speed, life } = value;
  if (
    !isFiniteNumber(id) ||
    !isString(owner) ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(z) ||
    !isFiniteNumber(angle) ||
    !isFiniteNumber(speed) ||
    !isFiniteNumber(life)
  ) {
    return null;
  }
  return { id, owner, x, z, angle, speed, life };
}

function parseSnapshot(raw: UnknownRecord): DuelSnapshot | null {
  const {
    tick,
    serverTime,
    round,
    score,
    state,
    stateTimer,
    timeScale,
    lastWinner,
    matchWinner,
    players,
    bullets,
  } = raw;

  if (
    !isFiniteNumber(tick) ||
    !isFiniteNumber(serverTime) ||
    !isFiniteNumber(round) ||
    !isFinitePair(score) ||
    !isRoundState(state) ||
    !isFiniteNumber(stateTimer) ||
    !isFiniteNumber(timeScale)
  ) {
    return null;
  }

  let safeLastWinner: string | null;
  if (lastWinner === null) safeLastWinner = null;
  else if (isString(lastWinner)) safeLastWinner = lastWinner;
  else return null;

  let safeMatchWinner: string | null;
  if (matchWinner === null) safeMatchWinner = null;
  else if (isString(matchWinner)) safeMatchWinner = matchWinner;
  else return null;

  if (!isArray(players) || players.length > MAX_PLAYERS) return null;
  if (!isArray(bullets) || bullets.length > MAX_BULLETS) return null;

  const parsedPlayers: DuelPlayerSnapshot[] = [];
  for (const player of players) {
    const parsed = parsePlayer(player);
    if (!parsed) return null;
    parsedPlayers.push(parsed);
  }

  const parsedBullets: DuelBulletSnapshot[] = [];
  for (const bullet of bullets) {
    const parsed = parseBullet(bullet);
    if (!parsed) return null;
    parsedBullets.push(parsed);
  }

  return {
    t: 'snapshot',
    tick,
    serverTime,
    round,
    score: [score[0], score[1]],
    state,
    stateTimer,
    timeScale,
    lastWinner: safeLastWinner,
    matchWinner: safeMatchWinner,
    players: parsedPlayers,
    bullets: parsedBullets,
  };
}

function parseEvent(raw: UnknownRecord): DuelEvent | null {
  const { kind, who, x, z, angle, target } = raw;
  if (!isEventKind(kind) || !isString(who)) return null;
  if (x !== undefined && !isFiniteNumber(x)) return null;
  if (z !== undefined && !isFiniteNumber(z)) return null;
  if (angle !== undefined && !isFiniteNumber(angle)) return null;
  if (target !== undefined && !isString(target)) return null;

  const event: DuelEvent = { t: 'event', kind, who };
  if (isFiniteNumber(x)) event.x = x;
  if (isFiniteNumber(z)) event.z = z;
  if (isFiniteNumber(angle)) event.angle = angle;
  if (isString(target)) event.target = target;
  return event;
}

/**
 * Thin WebSocket client for the authoritative duel server.
 *
 * Use `latest`/`onSnapshot` for authoritative UI values (HP, ammo, score) and
 * `getInterpolatedPlayers`/`getInterpolatedBullets` for per-frame visuals.
 */
export class DuelClient {
  private readonly url: string;
  private readonly callbacks: DuelCallbacks;
  private readonly inputIntervalMs: number;
  private readonly pingIntervalMs: number;
  private readonly fireIntervalMs: number;
  private readonly actionIntervalMs: number;
  private readonly interpolationDelayMs: number;

  private socket: WebSocket | null = null;
  private statusValue: DuelStatus = 'idle';
  private statusDetail: string | undefined;
  private name = 'Ronin';
  private skin = 'skin-ronin';
  private requestPending = false;
  private requestedRoom: string | null = null;
  private requestedCreate = false;
  private joinSent = false;
  private joined = false;

  private playerId: string | null = null;
  private sideValue: 0 | 1 | null = null;
  private roomValue: string | null = null;

  private latestSnapshot: DuelSnapshot | null = null;
  private snapshotBuffer: BufferedSnapshot[] = [];
  private rttMs = 0;

  private moveX = 0;
  private moveZ = 0;
  private aimX = 0;
  private aimZ = 1;

  private inputSeq = 0;
  private actionId = 0;
  private lastActionSentAt: number | null = null;
  private pendingActionMask = 0;
  private actionFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private actionMicrotaskQueued = false;

  private firing = false;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private fireTimer: ReturnType<typeof setInterval> | null = null;

  constructor(url: string, callbacks: DuelCallbacks, options: DuelClientOptions = {}) {
    this.url = url;
    this.callbacks = callbacks;
    this.inputIntervalMs = 1000 / optionNumber(options.inputHz, 30, 2, 60);
    this.pingIntervalMs = optionNumber(options.pingIntervalMs, 2000, 250, 60_000);
    this.fireIntervalMs = optionNumber(options.fireIntervalMs, 200, 50, 5000);
    this.actionIntervalMs = optionNumber(options.actionIntervalMs, 64, 50, 1000);
    this.interpolationDelayMs = optionNumber(options.interpolationDelayMs, 50, 0, 500);
  }

  /** Latest accepted snapshot. It survives a close for final UI, and is cleared when a new connection opens. */
  get latest(): DuelSnapshot | null {
    return this.latestSnapshot;
  }

  get status(): DuelStatus {
    return this.statusValue;
  }

  /** Latest measured ping round-trip in milliseconds; 0 before the first pong and reset on a new connection. */
  get rtt(): number {
    return this.rttMs;
  }

  get localId(): string | null {
    return this.playerId;
  }

  get side(): 0 | 1 | null {
    return this.sideValue;
  }

  get room(): string | null {
    return this.roomValue;
  }

  /**
   * Open the socket if needed and join without a room code. The name is
   * sanitized by the shared helper and is only applied if the join has not
   * already been sent yet.
   */
  connect(name: string, skin = 'skin-ronin'): void {
    this.name = sanitizeName(name);
    this.skin = /^skin-[a-z0-9-]{1,32}$/.test(skin) ? skin : 'skin-ronin';
    if (this.joinSent || this.joined) return;
    this.requestPending = true;
    if (this.isOpen()) this.trySendJoin();
    else this.ensureOpen();
  }

  /** Queue for the next opponent (join without a room code). */
  quickMatch(): void {
    this.requestedCreate = false;
    this.requestJoin(null);
  }

  /** Open a brand-new private room; the server returns its code. */
  createRoom(): void {
    this.requestedCreate = false;
    if (this.joinSent || this.joined) return;
    this.requestedCreate = true;
    this.requestJoin(null);
  }

  /** Join a specific room code. Blank codes are rejected locally. */
  joinRoom(code: string): void {
    const room = typeof code === 'string' ? code.trim() : '';
    if (!room) {
      this.reportLocalError('invalid_room', 'Informe um código de sala válido.');
      return;
    }
    this.requestedCreate = false;
    this.requestJoin(room.slice(0, 64));
  }

  /** Send a leave message (when possible) and close the socket. */
  leave(): void {
    this.closeCurrentSocket(true);
  }

  /** Close the socket without telling the server. */
  disconnect(): void {
    this.closeCurrentSocket(false);
  }

  /** Normalized world-space movement intent: x = east, z = south. */
  setMove(x: number, z: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    let mx = clamp(x, -1, 1);
    let mz = clamp(z, -1, 1);
    const length = Math.hypot(mx, mz);
    if (length > 1) {
      mx /= length;
      mz /= length;
    }
    this.moveX = mx;
    this.moveZ = mz;
  }

  /** Normalized world-space aim direction: x = east, z = south. */
  setAim(x: number, z: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const length = Math.hypot(x, z);
    if (!Number.isFinite(length) || length <= 0.01) return;
    this.aimX = x / length;
    this.aimZ = z / length;
  }

  /**
   * The protocol has no "firing" message, so holding fire is expressed as
   * shoot actions every ~200ms. The server still enforces ammo and cooldown.
   */
  setFiring(on: boolean): void {
    this.firing = Boolean(on);
    this.syncFiringLoop();
  }

  /**
   * Queue an action. Actions issued in the same event-loop turn are coalesced
   * into one bitmask packet, and packets are capped at ~16/s locally. The
   * server applies its own budget and validates game state.
   */
  action(name: ActionName): void {
    const mask = ACTIONS[name];
    if (typeof mask !== 'number') return;
    this.enqueueAction(mask);
  }

  /** Send one ping immediately (the regular ping loop runs every ~2s). */
  sendPing(): void {
    if (!this.isOpen()) return;
    this.send({ t: 'ping', ts: performance.now() });
  }

  /**
   * Interpolated player snapshots for rendering. `now` uses the
   * performance.now() timeline; values other than motion fields come from the
   * newer snapshot in the pair.
   */
  getInterpolatedPlayers(now = performance.now()): DuelPlayerSnapshot[] {
    const frame = this.sampleFrame(now);
    if (!frame) return [];
    const { from, to, alpha } = frame;
    if (from === to) return to.snapshot.players.map((player) => ({ ...player }));

    const previous = new Map(from.snapshot.players.map((player) => [player.id, player]));
    return to.snapshot.players.map((player) => {
      const before = previous.get(player.id);
      if (!before) return { ...player };
      return {
        ...player,
        x: lerp(before.x, player.x, alpha),
        z: lerp(before.z, player.z, alpha),
        angle: lerpAngle(before.angle, player.angle, alpha),
      };
    });
  }

  /** Interpolated bullets for rendering, matched by bullet id. */
  getInterpolatedBullets(now = performance.now()): DuelBulletSnapshot[] {
    const frame = this.sampleFrame(now);
    if (!frame) return [];
    const { from, to, alpha } = frame;
    if (from === to) return to.snapshot.bullets.map((bullet) => ({ ...bullet }));

    const previous = new Map(from.snapshot.bullets.map((bullet) => [bullet.id, bullet]));
    return to.snapshot.bullets.map((bullet) => {
      const before = previous.get(bullet.id);
      if (!before) return { ...bullet };
      return {
        ...bullet,
        x: lerp(before.x, bullet.x, alpha),
        z: lerp(before.z, bullet.z, alpha),
        angle: lerpAngle(before.angle, bullet.angle, alpha),
        life: lerp(before.life, bullet.life, alpha),
      };
    });
  }

  private requestJoin(room: string | null): void {
    if (this.joinSent || this.joined) return;
    this.requestedRoom = room;
    this.requestPending = true;
    if (this.isOpen()) this.trySendJoin();
    else this.ensureOpen();
  }

  private ensureOpen(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.openSocket();
  }

  private openSocket(): void {
    if (typeof WebSocket === 'undefined') {
      this.setStatus('error', 'WebSocket indisponível');
      this.reportLocalError('no_websocket', 'WebSocket não está disponível neste ambiente.');
      return;
    }

    this.detachSocket();
    this.resetSession();

    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'URL de WebSocket inválida.';
      this.setStatus('error', message);
      this.reportLocalError('invalid_url', message);
      return;
    }

    this.socket = ws;

    ws.onopen = () => {
      if (this.socket !== ws) return;
      this.setStatus('connected');
      this.trySendJoin();
    };

    ws.onmessage = (event: MessageEvent) => {
      if (this.socket !== ws) return;
      this.handleRawMessage(event.data);
    };

    ws.onerror = () => {
      if (this.socket !== ws) return;
      this.setStatus('error', 'Falha na conexão WebSocket');
      this.reportLocalError('socket_error', 'Falha na conexão WebSocket.');
    };

    ws.onclose = (event: CloseEvent) => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.stopCurrentSession();
      this.requestPending = false;
      this.requestedRoom = null;
      this.requestedCreate = false;
      this.setStatus('closed', describeClose(event));
    };

    // Set the status last: user callbacks may call leave()/joinRoom() again.
    this.setStatus('connecting');
  }

  private detachSocket(): void {
    const old = this.socket;
    this.socket = null;
    if (!old) return;
    old.onopen = null;
    old.onmessage = null;
    old.onerror = null;
    old.onclose = null;
    try {
      old.close(1000, 'replaced');
    } catch {
      /* already closed */
    }
  }

  private closeCurrentSocket(sendLeave: boolean): void {
    const ws = this.socket;
    this.socket = null;

    if (ws) {
      if (sendLeave && ws.readyState === WebSocket.OPEN) {
        const message: ClientMessage = { t: 'leave' };
        try {
          ws.send(JSON.stringify(message));
        } catch {
          /* the close below still tears the socket down */
        }
      }
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close(1000, sendLeave ? 'leave' : 'disconnect');
      } catch {
        /* already closed */
      }
    }

    this.stopCurrentSession();
    this.requestPending = false;
    this.requestedRoom = null;
    this.requestedCreate = false;
    this.setStatus('closed', sendLeave ? 'left' : 'disconnected');
  }

  private trySendJoin(): void {
    if (this.joinSent || !this.requestPending || !this.isOpen()) return;
    const message: ClientMessage = { t: 'join', name: this.name, skin: this.skin };
    if (this.requestedRoom !== null) message.room = this.requestedRoom;
    if (this.requestedCreate) message.create = true;
    if (this.send(message)) {
      this.joinSent = true;
      this.requestPending = false;
    }
  }

  private isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private canTransmit(): boolean {
    return this.joined && this.isOpen();
  }

  private send(message: ClientMessage): boolean {
    const ws = this.socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  private startNetworkLoops(): void {
    this.stopInputLoop();
    this.stopPingLoop();
    this.inputTimer = setInterval(() => this.sendInput(), this.inputIntervalMs);
    this.pingTimer = setInterval(() => this.sendPing(), this.pingIntervalMs);
    this.sendInput();
    this.sendPing();
    this.syncFiringLoop();
  }

  private stopNetworkLoops(): void {
    this.stopInputLoop();
    this.stopPingLoop();
  }

  private stopInputLoop(): void {
    if (this.inputTimer !== null) {
      clearInterval(this.inputTimer);
      this.inputTimer = null;
    }
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private stopFiringLoop(): void {
    if (this.fireTimer !== null) {
      clearInterval(this.fireTimer);
      this.fireTimer = null;
    }
  }

  private stopActionFlush(): void {
    if (this.actionFlushTimer !== null) {
      clearTimeout(this.actionFlushTimer);
      this.actionFlushTimer = null;
    }
    this.pendingActionMask = 0;
  }

  private sendInput(): void {
    if (!this.canTransmit()) return;
    this.inputSeq += 1;
    this.send({
      t: 'input',
      seq: this.inputSeq,
      move: [this.moveX, this.moveZ],
      aim: [this.aimX, this.aimZ],
    });
  }

  private syncFiringLoop(): void {
    if (!this.firing || !this.canTransmit()) {
      this.stopFiringLoop();
      return;
    }
    if (this.fireTimer !== null) return;
    this.enqueueAction(ACTIONS.shoot);
    this.fireTimer = setInterval(() => {
      if (!this.firing || !this.canTransmit()) {
        this.stopFiringLoop();
        return;
      }
      this.enqueueAction(ACTIONS.shoot);
    }, this.fireIntervalMs);
  }

  private enqueueAction(mask: number): void {
    if (!this.canTransmit()) return;
    this.pendingActionMask |= mask;
    if (this.actionFlushTimer !== null || this.actionMicrotaskQueued) return;

    this.actionMicrotaskQueued = true;
    queueMicrotask(() => {
      this.actionMicrotaskQueued = false;
      if (!this.pendingActionMask) return;
      if (!this.canTransmit()) {
        this.pendingActionMask = 0;
        return;
      }

      const wait =
        this.actionIntervalMs -
        (this.lastActionSentAt === null ? Number.POSITIVE_INFINITY : performance.now() - this.lastActionSentAt);
      if (wait > 0) {
        if (this.actionFlushTimer === null) {
          this.actionFlushTimer = setTimeout(() => {
            this.actionFlushTimer = null;
            this.flushActions();
          }, wait);
        }
        return;
      }
      this.flushActions();
    });
  }

  private flushActions(): void {
    const mask = this.pendingActionMask;
    this.pendingActionMask = 0;
    if (!mask || !this.canTransmit()) return;

    this.lastActionSentAt = performance.now();
    this.actionId += 1;
    this.send({ t: 'action', id: this.actionId, a: mask });
  }

  /** Stop everything that can touch the wire; keeps display state for a closed UI. */
  private stopCurrentSession(): void {
    this.stopNetworkLoops();
    this.stopFiringLoop();
    this.stopActionFlush();
    this.firing = false;
    this.joined = false;
    this.joinSent = false;
  }

  /** Forget the previous session entirely; used only when a new socket opens. */
  private resetSession(): void {
    this.stopCurrentSession();
    this.playerId = null;
    this.sideValue = null;
    this.roomValue = null;
    this.latestSnapshot = null;
    this.snapshotBuffer = [];
    this.rttMs = 0;
    this.moveX = 0;
    this.moveZ = 0;
    this.aimX = 0;
    this.aimZ = 1;
    this.inputSeq = 0;
    this.actionId = 0;
    this.lastActionSentAt = null;
  }

  private handleRawMessage(data: unknown): void {
    if (typeof data !== 'string') return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isRecord(parsed) || !isString(parsed.t)) return;

    switch (parsed.t) {
      case 'welcome': {
        const welcome = parseWelcome(parsed);
        if (!welcome) return;
        this.playerId = welcome.id;
        this.roomValue = welcome.room;
        this.sideValue = welcome.side;
        this.joined = true;
        this.joinSent = true;
        this.requestPending = false;
        this.startNetworkLoops();
        safeCall(this.callbacks.onWelcome, welcome);
        return;
      }
      case 'queue': {
        const room = parseQueue(parsed);
        if (!room) return;
        this.roomValue = room;
        this.setStatus('queued', room);
        safeCall(this.callbacks.onQueue, room);
        return;
      }
      case 'matched': {
        const matched = parseMatched(parsed);
        if (!matched) return;
        this.roomValue = matched.room;
        this.sideValue = matched.side;
        if (!this.joined) {
          // Defensive: a matched message is proof the server accepted us.
          this.joined = true;
          this.startNetworkLoops();
        }
        this.setStatus('matched', matched.room);
        safeCall(this.callbacks.onMatched, matched);
        return;
      }
      case 'snapshot': {
        const snapshot = parseSnapshot(parsed);
        if (!snapshot) return;
        if (this.latestSnapshot && snapshot.serverTime < this.latestSnapshot.serverTime) return;
        this.latestSnapshot = snapshot;
        this.snapshotBuffer.push({ snapshot, receivedAt: performance.now() });
        if (this.snapshotBuffer.length > 3) this.snapshotBuffer.shift();
        safeCall(this.callbacks.onSnapshot, snapshot);
        return;
      }
      case 'event': {
        const event = parseEvent(parsed);
        if (!event) return;
        safeCall(this.callbacks.onEvent, event);
        return;
      }
      case 'end': {
        const end = parseEnd(parsed);
        if (!end) return;
        this.firing = false;
        this.stopFiringLoop();
        this.stopActionFlush();
        safeCall(this.callbacks.onEnd, end);
        return;
      }
      case 'pong': {
        const ts = parsePong(parsed);
        if (ts === null) return;
        const sample = performance.now() - ts;
        if (!Number.isFinite(sample) || sample < 0 || sample > MAX_RTT_MS) return;
        this.rttMs = Math.round(sample);
        safeCall(this.callbacks.onPong, this.rttMs);
        return;
      }
      case 'error': {
        const error = parseError(parsed);
        if (!error) return;
        this.firing = false;
        this.stopFiringLoop();
        this.stopActionFlush();
        this.setStatus('error', `${error.code}: ${error.message}`);
        safeCall(this.callbacks.onError, error.code, error.message);
        return;
      }
      default:
        // Unknown message types are ignored on purpose (forward compatibility).
        return;
    }
  }

  /**
   * Pick the two snapshots surrounding `now - interpolationDelay` on the
   * server timeline. The local receive time of the newest snapshot anchors the
   * server clock, so interpolation itself uses authoritative serverTime deltas
   * (less sensitive to network jitter). There is no extrapolation: past the
   * newest snapshot the newest state is held.
   */
  private sampleFrame(now: number): SnapshotFrame | null {
    const buffer = this.snapshotBuffer;
    if (buffer.length === 0) return null;

    const latest = buffer[buffer.length - 1];
    if (buffer.length === 1) return { from: latest, to: latest, alpha: 0 };

    const sampleTime = Number.isFinite(now) ? now : performance.now();
    const targetServerTime =
      latest.snapshot.serverTime + (sampleTime - latest.receivedAt) - this.interpolationDelayMs;
    const oldest = buffer[0];
    if (targetServerTime <= oldest.snapshot.serverTime) {
      return { from: oldest, to: oldest, alpha: 0 };
    }

    for (let i = 0; i < buffer.length - 1; i += 1) {
      const from = buffer[i];
      const to = buffer[i + 1];
      if (targetServerTime > to.snapshot.serverTime) continue;
      const span = to.snapshot.serverTime - from.snapshot.serverTime;
      const alpha = span > 0 ? clamp((targetServerTime - from.snapshot.serverTime) / span, 0, 1) : 1;
      return { from, to, alpha };
    }

    return { from: latest, to: latest, alpha: 0 };
  }

  private setStatus(next: DuelStatus, detail?: string): void {
    if (this.statusValue === next && this.statusDetail === detail) return;
    this.statusValue = next;
    this.statusDetail = detail;
    safeCall(this.callbacks.onStatus, next, detail);
  }

  private reportLocalError(code: string, message: string): void {
    safeCall(this.callbacks.onError, code, message);
  }
}

function describeClose(event: CloseEvent): string {
  const reason = typeof event.reason === 'string' ? event.reason.trim() : '';
  if (reason) return reason;
  return event.code === 1000 ? 'fechado' : `fechado (${event.code})`;
}
