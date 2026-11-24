import { DuelRoom, type ServerPlayer } from '../../server/duel-room';
import {
  DUEL_HEIGHT,
  DUEL_RULES,
  DUEL_WIDTH,
  duelColliders,
  spawnPoint,
  type DuelSnapshot,
  type ServerMessage,
} from '../../src/shared/duel';

/** Loosely typed view over every server message, convenient in assertions. */
export type WireMessage = ServerMessage & Record<string, any>;

export interface FakeSocket {
  sent: string[];
  closed: { code?: number; reason?: string } | null;
  readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

/**
 * Minimal in-memory stand-in for Bun's ServerWebSocket. It records raw JSON
 * frames so tests can assert exactly what the room put on the wire.
 */
export function fakeSocket(): FakeSocket {
  return {
    sent: [],
    closed: null,
    readyState: 1,
    send(data: string) {
      this.sent.push(data);
    },
    close(code?: number, reason?: string) {
      this.closed = { code, reason };
      this.readyState = 3;
    },
  };
}

export function messagesOf<T = WireMessage>(ws: FakeSocket, type?: string): T[] {
  const out: T[] = [];
  for (const raw of ws.sent) {
    const msg = JSON.parse(raw) as WireMessage;
    if (type === undefined || msg.t === type) out.push(msg as T);
  }
  return out;
}

export function lastMessage<T = WireMessage>(ws: FakeSocket, type?: string): T | undefined {
  const list = messagesOf<T>(ws, type);
  return list[list.length - 1];
}

export function lastSnapshot(ws: FakeSocket): DuelSnapshot | undefined {
  return lastMessage<DuelSnapshot>(ws, 'snapshot');
}

/**
 * A complete player with server-owned defaults. `join`/`beginMatch` overwrite
 * the gameplay fields, but keeping a full object makes every room path work.
 */
export function makePlayer(
  socket: FakeSocket,
  side: 0 | 1,
  id: string,
  name: string,
): ServerPlayer {
  const spawn = spawnPoint(side);
  return {
    id,
    side,
    name,
    ws: socket as unknown as ServerPlayer['ws'],
    x: spawn.x,
    z: spawn.z,
    angle: 0,
    vx: 0,
    vz: 0,
    hp: 1,
    ammo: DUEL_RULES.spawnAmmo,
    focus: 0,
    alive: true,
    invuln: 0,
    dashCd: 0,
    dashTime: 0,
    dashX: 0,
    dashZ: 0,
    parryCd: 0,
    parryWindow: 0,
    slashCd: 0,
    specialCd: 0,
    fireCd: 0,
    lastInputSeq: 0,
    lastActionId: 0,
    move: [0, 0],
    aim: [0, 1],
    firing: false,
    actionBudget: 0,
    lastActionAt: 0,
    joinedAt: Date.now(),
  } as ServerPlayer;
}

export interface RoomHarness {
  room: DuelRoom;
  emptyCount: number;
  closedCount: number;
}

/**
 * Creates a room with its wall-clock interval stopped: every test advances the
 * simulation explicitly with stepSim/stepRoom, which keeps results deterministic.
 */
export function makeRoom(code = 'ROOM'): RoomHarness {
  const harness: RoomHarness = {
    room: undefined as unknown as DuelRoom,
    emptyCount: 0,
    closedCount: 0,
  };
  harness.room = new DuelRoom({
    code,
    onEmpty: () => {
      harness.emptyCount += 1;
    },
    onClosed: () => {
      harness.closedCount += 1;
    },
  });
  stopTimer(harness.room);
  return harness;
}

export function stopTimer(room: DuelRoom): void {
  const timer = (room as any).timer;
  if (timer !== null && timer !== undefined) clearInterval(timer);
  (room as any).timer = null;
}

export interface MatchHarness extends RoomHarness {
  sockets: [FakeSocket, FakeSocket];
  players: [ServerPlayer, ServerPlayer];
}

export function makeMatch(code = 'ROOM'): MatchHarness {
  const base = makeRoom(code);
  const socketA = fakeSocket();
  const socketB = fakeSocket();
  const playerA = makePlayer(socketA, 0, 'p0', 'Alpha');
  const playerB = makePlayer(socketB, 1, 'p1', 'Beta');
  base.room.join(playerA);
  base.room.join(playerB);
  // Object.assign preserva a identidade de `base`, cujos contadores são
  // atualizados pelos callbacks do DuelRoom (um spread copiaria os valores).
  return Object.assign(base, {
    sockets: [socketA, socketB] as [FakeSocket, FakeSocket],
    players: [playerA, playerB] as [ServerPlayer, ServerPlayer],
  });
}

/**
 * Test-only room registry: every room created through it is closed in
 * afterEach, which also clears the setInterval created by the constructor.
 */
export function roomTracker() {
  const rooms: DuelRoom[] = [];
  return {
    room(code = 'ROOM'): RoomHarness {
      const harness = makeRoom(code);
      rooms.push(harness.room);
      return harness;
    },
    match(code = 'ROOM'): MatchHarness {
      const harness = makeMatch(code);
      rooms.push(harness.room);
      return harness;
    },
    closeAll(): void {
      for (const room of rooms.splice(0)) room.close();
    },
  };
}

/** Puts a match into the live state without waiting for the countdown. */
export function enterLive(room: DuelRoom, clearInvuln = true): void {
  room.state = 'live';
  room.stateTimer = 0;
  if (clearInvuln) {
    for (const player of room.players) player.invuln = 0;
  }
}

/** Places a player at exact coordinates with a normalized aim. */
export function place(
  player: ServerPlayer,
  x: number,
  z: number,
  aim: [number, number],
): void {
  player.x = x;
  player.z = z;
  player.vx = 0;
  player.vz = 0;
  player.aim = [aim[0], aim[1]];
  player.angle = Math.atan2(aim[0], aim[1]);
}

/**
 * Sends an action while bypassing the anti-spam budget, so tests exercise the
 * action itself. The budget gets its own dedicated test.
 */
export function act(
  room: DuelRoom,
  player: ServerPlayer,
  actionId: number,
  mask: number,
): void {
  player.lastActionAt = 0;
  room.action(player.id, actionId, mask);
}

export function stepSim(room: DuelRoom, ticks = 1): void {
  for (let i = 0; i < ticks; i++) (room as any).simulate();
}

export function stepRoom(room: DuelRoom, ticks = 1): void {
  for (let i = 0; i < ticks; i++) (room as any).tickRoom();
}

/** Forces a snapshot broadcast and returns it, without waiting for a real tick. */
export function forceSnapshot(room: DuelRoom): DuelSnapshot {
  (room as any).broadcastSnapshot(true);
  const socket = room.players[0]?.ws as unknown as FakeSocket | undefined;
  if (!socket) throw new Error('forceSnapshot precisa de pelo menos um jogador');
  const snapshot = lastSnapshot(socket);
  if (!snapshot) throw new Error('snapshot não foi transmitido');
  return snapshot;
}

export const WALL_LIMIT_X = (DUEL_WIDTH - 1) / 2 - 0.5;
export const WALL_LIMIT_Z = (DUEL_HEIGHT - 1) / 2 - 0.5;

const COLLIDERS = duelColliders();

/**
 * True when the player's circle overlaps any wall/block collider. The small
 * tolerance ignores the exact contact position produced by resolution.
 */
export function overlapsAnyCollider(
  x: number,
  z: number,
  radius = 0.3,
  tolerance = 1e-6,
): boolean {
  const effectiveRadius = radius - tolerance;
  for (const collider of COLLIDERS) {
    const nearestX = Math.max(collider.minX, Math.min(collider.maxX, x));
    const nearestZ = Math.max(collider.minZ, Math.min(collider.maxZ, z));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    if (dx * dx + dz * dz < effectiveRadius * effectiveRadius) return true;
  }
  return false;
}
