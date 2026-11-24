/**
 * MOVESTOP authoritative duel server.
 *
 * Responsibilities:
 * - serve the built Vite client from dist/ (SPA fallback + security headers);
 * - accept WebSockets on /ws with Origin validation and per-IP caps;
 * - translate validated client intents into DuelRoom calls;
 * - own heartbeats, rate limits, room lifecycle and logging.
 *
 * The server never accepts positions, health, ammo, damage, focus, rounds or
 * results from a client. DuelRoom is the only source of gameplay state.
 */

import { lstat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import type { Server, ServerWebSocket } from 'bun';

import { DuelRoom, type ServerPlayer, type SocketData } from './duel-room';
import {
  DUEL_RULES,
  isFinitePair,
  sanitizeName,
  type ServerMessage,
} from '../src/shared/duel';
import {
  clientIp,
  isOriginAllowed,
  parseAllowedOrigins,
  securedHeaders,
  textResponse,
  type OriginPolicy,
} from './security';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function readIntegerEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    console.warn(`[duel] ${name} inválido (esperado inteiro entre ${min} e ${max}); usando ${fallback}`);
    return fallback;
  }
  return value;
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false;

  console.warn(`[duel] ${name} inválido (use 1/0); usando ${fallback ? '1' : '0'}`);
  return fallback;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = readIntegerEnv('PORT', 8788, 1, 65_535);
/** Hard cap from the protocol/deploy budget: never more than 200 rooms. */
const MAX_ROOMS = readIntegerEnv('MAX_ROOMS', 200, 1, 200);
const TRUST_PROXY = readBooleanEnv('TRUST_PROXY', false);
const parsedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

const MAX_CONNECTIONS_PER_IP = 5;
const MAX_MESSAGE_BYTES = 1024;
const MAX_MESSAGES_PER_SECOND = 60;
const MAX_JOIN_FAILURES = 15;
const MAX_VECTOR_COMPONENT = 10_000;

const HEARTBEAT_PING_MS = 20_000;
const HEARTBEAT_TIMEOUT_MS = 45_000;
const HEARTBEAT_SWEEP_MS = 5_000;

const ORIGIN_POLICY: OriginPolicy = {
  allowedOrigins: parsedOrigins.origins,
  production: IS_PRODUCTION,
  trustProxy: TRUST_PROXY,
};

// ---------------------------------------------------------------------------
// Paths and MIME
// ---------------------------------------------------------------------------

const DIST_DIR = resolve(import.meta.dir, '..', 'dist');
const INDEX_FILE = resolve(DIST_DIR, 'index.html');
const ASSETS_DIR = resolve(DIST_DIR, 'assets');
const FONTS_DIR = resolve(DIST_DIR, 'fonts');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
};

// ---------------------------------------------------------------------------
// Types and state
// ---------------------------------------------------------------------------

interface ConnectionData extends SocketData {
  ip: string;
  /** True while this socket owns a slot in ipCounts. */
  counted: boolean;
  lastSeenAt: number;
  lastPingAt: number;
  messageTimes: number[];
  joinFailures: number;
}

const rooms = new Map<string, DuelRoom>();
/** Rooms created with join.create are never auto-filled by quick match. */
const privateRooms = new Set<string>();
const connections = new Set<ServerWebSocket<ConnectionData>>();
const ipCounts = new Map<string, number>();

let lastOriginRejectLog = Number.NEGATIVE_INFINITY;

// ---------------------------------------------------------------------------
// Logging (never names, room codes, IPs, message bodies or Origin values)
// ---------------------------------------------------------------------------

function log(message: string): void {
  console.log(`[duel ${new Date().toISOString()}] ${message}`);
}

function warn(message: string): void {
  console.warn(`[duel ${new Date().toISOString()}] ${message}`);
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;
const ROOM_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Uniform, cryptographically secure 6-char code (36^6 ≈ 2.2 billion). */
function generateRoomCode(): string {
  let code = '';
  while (code.length < 6) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    for (const byte of bytes) {
      // 252 = 36 * 7; rejecting 252..255 avoids modulo bias.
      if (byte >= 252) continue;
      code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

function removeRoom(room: DuelRoom): void {
  if (rooms.get(room.code) !== room) return;
  rooms.delete(room.code);
  privateRooms.delete(room.code);
  log(`room closed rooms=${rooms.size}`);
}

function createRoom(privateRoom: boolean): DuelRoom | null {
  if (rooms.size >= MAX_ROOMS) return null;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = generateRoomCode();
    if (rooms.has(code)) continue;

    const room = new DuelRoom({
      code,
      onEmpty: (closed) => removeRoom(closed),
      onClosed: (closed) => removeRoom(closed),
    });
    rooms.set(code, room);
    if (privateRoom) privateRooms.add(code);
    return room;
  }

  warn('não foi possível gerar um código de sala livre');
  return null;
}

/** Public rooms waiting for a second player; private rooms need the code. */
function findWaitingRoom(): DuelRoom | null {
  for (const room of rooms.values()) {
    if (privateRooms.has(room.code)) continue;
    if (room.state === 'waiting' && room.players.length === 1) return room;
  }
  return null;
}

function countPlayers(): number {
  let total = 0;
  for (const room of rooms.values()) total += room.players.length;
  return total;
}

// ---------------------------------------------------------------------------
// Outbound helpers
// ---------------------------------------------------------------------------

function send(ws: ServerWebSocket<ConnectionData>, message: ServerMessage): void {
  try {
    ws.send(JSON.stringify(message));
  } catch {
    /* the close handler owns cleanup */
  }
}

function sendError(ws: ServerWebSocket<ConnectionData>, code: string, message: string): void {
  send(ws, { t: 'error', code, message });
}

function releaseIp(data: ConnectionData): void {
  if (!data.counted) return;
  data.counted = false;

  const current = ipCounts.get(data.ip) ?? 0;
  if (current <= 1) ipCounts.delete(data.ip);
  else ipCounts.set(data.ip, current - 1);
}

// ---------------------------------------------------------------------------
// Message validation
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSaneVector(vector: [number, number]): boolean {
  return Math.abs(vector[0]) <= MAX_VECTOR_COMPONENT && Math.abs(vector[1]) <= MAX_VECTOR_COMPONENT;
}

/**
 * Join has three modes:
 * - `room` set: enter that exact server-issued code (never creates it);
 * - `create: true`: always open a brand-new room and return its code;
 * - neither: quick match, filling the oldest room waiting for one player.
 *
 * `create` is accepted as an optional extension so a client can distinguish
 * "Criar sala" from "Partida rápida". The browser sends `create: true` for a
 * fresh private room; see docs/ONLINE.md.
 */
function handleJoin(ws: ServerWebSocket<ConnectionData>, msg: Record<string, unknown>): void {
  if (ws.data.room) {
    sendError(ws, 'ALREADY_IN_ROOM', 'Você já está em uma sala.');
    return;
  }

  let create = false;
  if (msg.create !== undefined) {
    if (typeof msg.create !== 'boolean') {
      rejectJoin(ws, 'BAD_JOIN', 'Pedido de entrada inválido.');
      return;
    }
    create = msg.create;
  }

  let requestedCode: string | null = null;
  if (msg.room !== undefined && msg.room !== null) {
    if (typeof msg.room !== 'string') {
      rejectJoin(ws, 'BAD_JOIN', 'Código de sala inválido.');
      return;
    }

    const trimmed = msg.room.trim();
    if (trimmed) {
      const code = trimmed.toUpperCase();
      if (code.length !== 6 || !ROOM_CODE_RE.test(code)) {
        rejectJoin(ws, 'BAD_ROOM_CODE', 'Use um código de 6 caracteres (A–Z, 0–9).');
        return;
      }
      requestedCode = code;
    }
  }

  if (create && requestedCode) {
    rejectJoin(ws, 'BAD_JOIN', 'Escolha criar uma sala ou entrar em uma sala existente.');
    return;
  }

  let room: DuelRoom | null = null;
  let created = false;

  if (requestedCode) {
    room = rooms.get(requestedCode) ?? null;
    if (!room) {
      rejectJoin(ws, 'ROOM_NOT_FOUND', 'Sala não encontrada. Confira o código.');
      return;
    }
    if (room.isFull) {
      rejectJoin(ws, 'ROOM_FULL', 'Sala cheia.');
      return;
    }
    if (room.state !== 'waiting') {
      rejectJoin(ws, 'ROOM_IN_PROGRESS', 'Esta sala já está em partida.');
      return;
    }
  } else if (create) {
    room = createRoom(true);
    created = room !== null;
    if (!room) {
      sendError(ws, 'SERVER_FULL', 'Servidor cheio, tente novamente.');
      return;
    }
  } else {
    room = findWaitingRoom();
    if (!room) {
      room = createRoom(false);
      created = room !== null;
    }
    if (!room) {
      sendError(ws, 'SERVER_FULL', 'Servidor cheio, tente novamente.');
      return;
    }
  }

  const side: 0 | 1 = room.players.length === 0 ? 0 : 1;
  const player: ServerPlayer = {
    id: crypto.randomUUID(),
    side,
    name: sanitizeName(msg.name),
    skin: typeof msg.skin === 'string' && /^skin-[a-z0-9-]{1,32}$/.test(msg.skin) ? msg.skin : 'skin-ronin',
    ws,
    x: 0,
    z: 0,
    angle: side === 0 ? Math.PI / 2 : -Math.PI / 2,
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
    lastInputSeq: -1,
    lastActionId: -1,
    move: [0, 0],
    aim: [0, 1],
    firing: false,
    actionBudget: 0,
    lastActionAt: 0,
    joinedAt: Date.now(),
  };

  if (!room.join(player)) {
    if (created) room.close();
    rejectJoin(ws, 'ROOM_FULL', 'Não foi possível entrar na sala.');
    return;
  }

  ws.data.room = room;
  ws.data.playerId = player.id;
  ws.data.joinFailures = 0;
  log(`join rooms=${rooms.size} players=${countPlayers()} connections=${connections.size}`);
}

function rejectJoin(ws: ServerWebSocket<ConnectionData>, code: string, message: string): void {
  sendError(ws, code, message);
  ws.data.joinFailures += 1;
  if (ws.data.joinFailures >= MAX_JOIN_FAILURES) {
    ws.close(1008, 'too many join attempts');
  }
}

function handleInput(ws: ServerWebSocket<ConnectionData>, msg: Record<string, unknown>): void {
  const room = ws.data.room;
  const playerId = ws.data.playerId;
  if (!room || !playerId) {
    sendError(ws, 'NOT_IN_ROOM', 'Entre em uma sala antes de enviar input.');
    return;
  }

  const seq = msg.seq;
  if (typeof seq !== 'number' || !Number.isSafeInteger(seq) || seq < 0) {
    sendError(ws, 'BAD_INPUT', 'Sequência de input inválida.');
    return;
  }

  const move = msg.move;
  const aim = msg.aim;
  if (!isFinitePair(move) || !isFinitePair(aim) || !isSaneVector(move) || !isSaneVector(aim)) {
    sendError(ws, 'BAD_INPUT', 'Vetor de input inválido.');
    return;
  }

  // DuelRoom normalizes/clamps move and aim and deduplicates seq.
  room.input(playerId, seq, [move[0], move[1]], [aim[0], aim[1]]);
}

function handleAction(ws: ServerWebSocket<ConnectionData>, msg: Record<string, unknown>): void {
  const room = ws.data.room;
  const playerId = ws.data.playerId;
  if (!room || !playerId) {
    sendError(ws, 'NOT_IN_ROOM', 'Entre em uma sala antes de enviar ações.');
    return;
  }

  const actionId = msg.id;
  if (typeof actionId !== 'number' || !Number.isSafeInteger(actionId) || actionId < 0) {
    sendError(ws, 'BAD_ACTION', 'Identificador de ação inválido.');
    return;
  }

  const mask = msg.a;
  if (typeof mask !== 'number' || !Number.isSafeInteger(mask) || mask < 0 || mask > 31) {
    sendError(ws, 'BAD_ACTION', 'Máscara de ação inválida.');
    return;
  }

  // DuelRoom deduplicates action ids and enforces game state + cooldowns.
  room.action(playerId, actionId, mask);
}

function handlePing(ws: ServerWebSocket<ConnectionData>, msg: Record<string, unknown>): void {
  const ts = typeof msg.ts === 'number' && Number.isFinite(msg.ts) ? msg.ts : 0;

  if (ws.data.room && ws.data.playerId) {
    ws.data.room.ping(ws.data.playerId, ts);
    return;
  }

  send(ws, { t: 'pong', ts });
}

function handleLeave(ws: ServerWebSocket<ConnectionData>): void {
  const room = ws.data.room;
  const playerId = ws.data.playerId;
  ws.data.room = undefined;
  ws.data.playerId = undefined;

  if (room && playerId) {
    room.leave(playerId);
    return;
  }

  ws.close(1000, 'left');
}

function handleClientMessage(
  ws: ServerWebSocket<ConnectionData>,
  msg: Record<string, unknown>,
): void {
  switch (msg.t) {
    case 'join':
      handleJoin(ws, msg);
      return;
    case 'input':
      handleInput(ws, msg);
      return;
    case 'action':
      handleAction(ws, msg);
      return;
    case 'ping':
      handlePing(ws, msg);
      return;
    case 'leave':
      handleLeave(ws);
      return;
    case 'ready':
      // Reserved for a future rematch flow. The room has no ready state yet.
      return;
    default:
      // Unknown protocol messages are a violation, not a forward-compatible
      // optional feature: close instead of guessing.
      ws.close(1008, 'unknown message');
  }
}

/** Fixed-window-per-second limiter; at most 60 timestamps are retained. */
function allowMessage(ws: ServerWebSocket<ConnectionData>, now: number): boolean {
  const times = ws.data.messageTimes;
  const cutoff = now - 1000;

  let expired = 0;
  while (expired < times.length && times[expired] <= cutoff) expired += 1;
  if (expired > 0) times.splice(0, expired);

  if (times.length >= MAX_MESSAGES_PER_SECOND) return false;
  times.push(now);
  return true;
}

// ---------------------------------------------------------------------------
// WebSocket lifecycle
// ---------------------------------------------------------------------------

function onOpen(ws: ServerWebSocket<ConnectionData>): void {
  const now = performance.now();
  ws.data.lastSeenAt = now;
  ws.data.lastPingAt = now;
  ws.data.messageTimes = [];
  ws.data.joinFailures = 0;
  connections.add(ws);
  log(`connection opened connections=${connections.size}`);
}

function onMessage(ws: ServerWebSocket<ConnectionData>, message: string | Buffer): void {
  const now = performance.now();
  ws.data.lastSeenAt = now;

  if (!allowMessage(ws, now)) {
    ws.close(1008, 'rate limit');
    return;
  }

  if (typeof message !== 'string') {
    ws.close(1008, 'text messages only');
    return;
  }

  if (Buffer.byteLength(message, 'utf8') > MAX_MESSAGE_BYTES) {
    ws.close(1009, 'message too large');
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message);
  } catch {
    ws.close(1008, 'invalid json');
    return;
  }

  if (!isRecord(parsed) || typeof parsed.t !== 'string') {
    ws.close(1008, 'invalid message');
    return;
  }

  handleClientMessage(ws, parsed);
}

function onClose(ws: ServerWebSocket<ConnectionData>, code: number): void {
  connections.delete(ws);

  const room = ws.data.room;
  const playerId = ws.data.playerId;
  ws.data.room = undefined;
  ws.data.playerId = undefined;

  try {
    if (room && playerId) room.leave(playerId);
  } catch (error) {
    warn(`room cleanup failed (${error instanceof Error ? error.name : 'unknown'})`);
  } finally {
    releaseIp(ws.data);
  }

  log(`connection closed code=${code} connections=${connections.size} rooms=${rooms.size}`);
}

function onPong(ws: ServerWebSocket<ConnectionData>): void {
  ws.data.lastSeenAt = performance.now();
}

function onProtocolPing(ws: ServerWebSocket<ConnectionData>): void {
  ws.data.lastSeenAt = performance.now();
}

function onWebSocketError(error: Error, ws: ServerWebSocket<ConnectionData>): void {
  warn(`websocket handler error (${error instanceof Error ? error.name : 'unknown'})`);
  try {
    ws.close(1011, 'internal error');
  } catch {
    /* already closing */
  }
}

// ---------------------------------------------------------------------------
// Static client (dist/) with SPA fallback
// ---------------------------------------------------------------------------

function hasFileExtension(segment: string): boolean {
  return /\.[A-Za-z0-9]{1,10}$/.test(segment);
}

function cacheControlFor(filePath: string): string {
  if (filePath === INDEX_FILE) return 'no-cache';
  if (filePath.startsWith(ASSETS_DIR + sep)) return 'public, max-age=31536000, immutable';
  if (filePath.startsWith(FONTS_DIR + sep)) return 'public, max-age=604800';
  return 'public, max-age=3600';
}

function fileResponse(filePath: string, size: number, head: boolean, cache: string): Response {
  const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
  const headers = securedHeaders({
    'Content-Type': type,
    'Content-Length': String(size),
    'Cache-Control': cache,
  });

  return new Response(head ? null : Bun.file(filePath), { status: 200, headers });
}

async function serveIndex(head: boolean): Promise<Response> {
  const info = await lstat(INDEX_FILE).catch(() => null);
  if (!info?.isFile()) {
    return textResponse(
      'Build do cliente não encontrado. Rode "bun run build" e reinicie o servidor.',
      503,
    );
  }

  return fileResponse(INDEX_FILE, info.size, head, 'no-cache');
}

async function serveStatic(req: Request, url: URL): Promise<Response> {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    return textResponse('Method Not Allowed', 405, { Allow: 'GET, HEAD' });
  }

  const head = method === 'HEAD';

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return textResponse('Bad Request', 400);
  }

  if (pathname.includes('\0') || pathname.startsWith('//')) {
    return textResponse('Not Found', 404);
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.startsWith('.'))) {
    return textResponse('Not Found', 404);
  }

  if (segments.length === 0) return serveIndex(head);

  const last = segments[segments.length - 1];
  const staticLooking =
    segments[0] === 'assets' || segments[0] === 'fonts' || hasFileExtension(last);

  // Unknown routes serve index.html so the SPA can handle them. Missing hashed
  // assets and fonts remain 404s instead of being masked by HTML.
  if (!staticLooking) return serveIndex(head);

  const filePath = resolve(DIST_DIR, ...segments);
  if (filePath !== DIST_DIR && !filePath.startsWith(DIST_DIR + sep)) {
    return textResponse('Bad Request', 400);
  }

  const info = await lstat(filePath).catch(() => null);
  if (!info?.isFile()) return textResponse('Not Found', 404);

  return fileResponse(filePath, info.size, head, cacheControlFor(filePath));
}

function healthResponse(method: string): Response {
  if (method !== 'GET' && method !== 'HEAD') {
    return textResponse('Method Not Allowed', 405, { Allow: 'GET, HEAD' });
  }

  const body = JSON.stringify({
    ok: true,
    uptime: Math.round(process.uptime()),
    rooms: rooms.size,
    maxRooms: MAX_ROOMS,
    players: countPlayers(),
    connections: connections.size,
  });

  const headers = securedHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });

  return new Response(method === 'HEAD' ? null : body, { status: 200, headers });
}

// ---------------------------------------------------------------------------
// WebSocket upgrade
// ---------------------------------------------------------------------------

function handleWebSocket(
  req: Request,
  server: Server<ConnectionData>,
): Response | undefined {
  if (req.method !== 'GET') {
    return textResponse('Method Not Allowed', 405, { Allow: 'GET' });
  }

  if ((req.headers.get('upgrade') ?? '').toLowerCase() !== 'websocket') {
    return textResponse('Upgrade Required', 426, { Upgrade: 'websocket' });
  }

  const origin = req.headers.get('origin');
  if (!isOriginAllowed(origin, req, ORIGIN_POLICY)) {
    const now = performance.now();
    if (now - lastOriginRejectLog > 10_000) {
      lastOriginRejectLog = now;
      warn('ws upgrade rejected: origin not allowed');
    }
    return textResponse('Forbidden', 403);
  }

  const ip = clientIp(req, server, TRUST_PROXY);
  const active = ipCounts.get(ip) ?? 0;
  if (active >= MAX_CONNECTIONS_PER_IP) {
    return textResponse('Too Many Connections', 429, { 'Retry-After': '30' });
  }

  const now = performance.now();
  const data: ConnectionData = {
    ip,
    counted: true,
    lastSeenAt: now,
    lastPingAt: now,
    messageTimes: [],
    joinFailures: 0,
  };

  // Reserve the slot before the upgrade so concurrent handshakes cannot
  // overshoot the per-IP limit. Roll back if Bun refuses the upgrade.
  ipCounts.set(ip, active + 1);

  try {
    if (!server.upgrade(req, { data })) {
      releaseIp(data);
      return textResponse('Bad Request', 400);
    }
  } catch {
    releaseIp(data);
    return textResponse('Bad Request', 400);
  }

  return undefined;
}

async function fetchHandler(
  req: Request,
  server: Server<ConnectionData>,
): Promise<Response | undefined> {
  try {
    const url = new URL(req.url);

    if (url.pathname === '/ws') return handleWebSocket(req, server);
    if (url.pathname === '/healthz') return healthResponse(req.method);

    return await serveStatic(req, url);
  } catch (error) {
    warn(`request error (${error instanceof Error ? error.name : 'unknown'})`);
    return textResponse('Erro interno', 500);
  }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

if (parsedOrigins.invalid > 0) {
  warn(`ALLOWED_ORIGINS: ${parsedOrigins.invalid} entrada(s) inválida(s) ignorada(s)`);
}

let server!: Server<ConnectionData>;
try {
  server = Bun.serve<ConnectionData>({
    hostname: '0.0.0.0',
    port: PORT,
    // Never render Bun's development error page, even outside NODE_ENV=production.
    development: false,
    maxRequestBodySize: 64 * 1024,
    fetch: fetchHandler,
    error(error) {
      warn(`server error (${error instanceof Error ? error.name : 'unknown'})`);
      return textResponse('Erro interno', 500);
    },
    websocket: {
      data: {} as ConnectionData,
      maxPayloadLength: MAX_MESSAGE_BYTES,
      // We own the heartbeat: protocol ping every 20s, close after 45s without
      // a pong or any client message. Disable Bun's independent idle timer.
      idleTimeout: 0,
      sendPings: false,
      perMessageDeflate: false,
      backpressureLimit: 1024 * 1024,
      closeOnBackpressureLimit: true,
      open: onOpen,
      message: onMessage,
      close: onClose,
      pong: onPong,
      ping: onProtocolPing,
      error: onWebSocketError,
    },
  });
} catch (error) {
  warn(`falha ao iniciar: ${error instanceof Error ? error.name : 'unknown'}`);
  process.exit(1);
}

const heartbeat = setInterval(() => {
  const now = performance.now();

  for (const ws of connections) {
    if (now - ws.data.lastSeenAt > HEARTBEAT_TIMEOUT_MS) {
      ws.close(1001, 'heartbeat timeout');
      continue;
    }

    if (now - ws.data.lastPingAt >= HEARTBEAT_PING_MS) {
      ws.data.lastPingAt = now;
      try {
        ws.ping();
      } catch {
        /* close/error handlers will clean up */
      }
    }
  }
}, HEARTBEAT_SWEEP_MS);

let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`shutting down (${signal})`);
  clearInterval(heartbeat);

  for (const room of [...rooms.values()]) {
    try {
      room.close();
    } catch (error) {
      warn(`room shutdown failed (${error instanceof Error ? error.name : 'unknown'})`);
    }
  }

  try {
    server.stop(true);
  } catch {
    /* already stopped */
  }

  setTimeout(() => process.exit(0), 100);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

log(
  `listening on http://0.0.0.0:${server.port} mode=${
    IS_PRODUCTION ? 'production' : 'development'
  } maxRooms=${MAX_ROOMS} allowedOrigins=${ORIGIN_POLICY.allowedOrigins.size} trustProxy=${
    TRUST_PROXY ? 'on' : 'off'
  }`,
);

if (!(await Bun.file(INDEX_FILE).exists())) {
  warn('dist/index.html não encontrado; o WebSocket funciona, mas o cliente retorna 503 até rodar "bun run build"');
}
