/**
 * Shared contract between the browser and the authoritative duel server.
 * Nothing in this file trusts the client: it is a description of intents,
 * arena geometry and snapshots, not a source of truth.
 */

export const DUEL_WIDTH = 21;
export const DUEL_HEIGHT = 15;
export const DUEL_TICK = 30;
export const DUEL_TICK_MS = 1000 / DUEL_TICK;
export const DUEL_ROUNDS_TO_WIN = 3;
export const DUEL_SPAWN_A: [number, number] = [7, 4];
export const DUEL_SPAWN_B: [number, number] = [7, 16];

export const DUEL_RULES = {
  moveSpeed: 4.75,
  dashSpeed: 13.5,
  dashTime: 0.16,
  dashCooldown: 1.5,
  dashInvuln: 0.16,
  fireCooldown: 0.2,
  bulletSpeed: 17.5,
  bulletLife: 2.4,
  parryRadius: 1.9,
  parryWindow: 0.18,
  parryCooldown: 1.4,
  slashCooldown: 0.26,
  slashRange: 2.05,
  slashArc: 1.35,
  specialRange: 3.3,
  specialLineWidth: 1.75,
  specialCooldown: 0.9,
  focusMax: 100,
  focusHit: 22,
  focusParry: 18,
  focusSlash: 30,
  maxAmmo: 8,
  spawnAmmo: 6,
  spawnInvuln: 1.1,
  roundDelay: 2.0,
  countdown: 1.6,
} as const;

export type DuelRoundState = 'waiting' | 'countdown' | 'live' | 'roundEnd' | 'matchEnd';

export const ACTIONS = {
  shoot: 1,
  parry: 2,
  dash: 4,
  slash: 8,
  special: 16,
} as const;

export type ActionName = keyof typeof ACTIONS;

export interface DuelPlayerSnapshot {
  id: string;
  side: 0 | 1;
  name: string;
  skin: string;
  x: number;
  z: number;
  angle: number;
  hp: number;
  ammo: number;
  focus: number;
  alive: boolean;
  invuln: number;
  dash: number;
  parry: number;
  firing: boolean;
}

export interface DuelBulletSnapshot {
  id: number;
  owner: string;
  x: number;
  z: number;
  angle: number;
  speed: number;
  life: number;
}

export interface DuelSnapshot {
  t: 'snapshot';
  tick: number;
  serverTime: number;
  round: number;
  score: [number, number];
  state: DuelRoundState;
  stateTimer: number;
  timeScale: number;
  lastWinner: string | null;
  matchWinner: string | null;
  players: DuelPlayerSnapshot[];
  bullets: DuelBulletSnapshot[];
}

export interface DuelEvent {
  t: 'event';
  kind: 'shot' | 'hit' | 'parry' | 'slash' | 'special' | 'dash' | 'round' | 'spawn' | 'match';
  who: string;
  x?: number;
  z?: number;
  angle?: number;
  target?: string;
}

export type ClientMessage =
  | { t: 'join'; room?: string; name?: string; skin?: string; create?: boolean }
  | { t: 'input'; seq: number; move: [number, number]; aim: [number, number] }
  | { t: 'action'; id: number; a: number }
  | { t: 'ready' }
  | { t: 'ping'; ts: number }
  | { t: 'leave' };

export type ServerMessage =
  | { t: 'welcome'; id: string; room: string; side: 0 | 1; name: string }
  | { t: 'queue'; room: string; players: number }
  | { t: 'matched'; room: string; side: 0 | 1; opponent: string; tick: number }
  | DuelSnapshot
  | DuelEvent
  | { t: 'end'; winner: string | null; score: [number, number]; reason: string }
  | { t: 'pong'; ts: number }
  | { t: 'error'; code: string; message: string };

/** A deliberately small, symmetric duel courtyard. */
export function buildDuelGrid(): string[] {
  const grid: string[][] = Array.from({ length: DUEL_HEIGHT }, (_, r) =>
    Array.from({ length: DUEL_WIDTH }, (_, c) => (r === 0 || c === 0 || r === DUEL_HEIGHT - 1 || c === DUEL_WIDTH - 1 ? '#' : '.')),
  );
  const blocks: [number, number][] = [
    [3, 3], [3, 4], [4, 3], [4, 4],
    [3, 17], [3, 16], [4, 17], [4, 16],
    [10, 3], [10, 4], [11, 3], [11, 4],
    [10, 17], [10, 16], [11, 17], [11, 16],
    [7, Math.floor(DUEL_WIDTH / 2)],
  ];
  for (const [r, c] of blocks) grid[r][c] = '#';
  grid[DUEL_SPAWN_A[0]][DUEL_SPAWN_A[1]] = 'A';
  grid[DUEL_SPAWN_B[0]][DUEL_SPAWN_B[1]] = 'B';
  return grid.map((row) => row.join(''));
}

export const DUEL_GRID = buildDuelGrid();

/** Cells that block movement and bullets on the server and on the client. */
export function duelColliders(): { minX: number; maxX: number; minZ: number; maxZ: number }[] {
  const out: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  const halfW = (DUEL_WIDTH - 1) / 2;
  const halfH = (DUEL_HEIGHT - 1) / 2;
  for (let r = 0; r < DUEL_HEIGHT; r++) {
    for (let c = 0; c < DUEL_WIDTH; c++) {
      if (DUEL_GRID[r][c] !== '#') continue;
      const x = c - halfW;
      const z = r - halfH;
      out.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
    }
  }
  return out;
}

export function spawnPoint(side: 0 | 1): { x: number; z: number } {
  const cell = side === 0 ? DUEL_SPAWN_A : DUEL_SPAWN_B;
  return { x: cell[1] - (DUEL_WIDTH - 1) / 2, z: cell[0] - (DUEL_HEIGHT - 1) / 2 };
}

export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return 'Ronin';
  const clean = raw.replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 16);
  return clean || 'Ronin';
}

export function isFinitePair(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
