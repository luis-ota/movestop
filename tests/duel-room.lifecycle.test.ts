import { afterEach, describe, expect, it } from 'bun:test';
import {
  DUEL_RULES,
  DUEL_TICK_MS,
  spawnPoint,
} from '../src/shared/duel';
import {
  fakeSocket,
  lastMessage,
  lastSnapshot,
  makePlayer,
  messagesOf,
  roomTracker,
} from './support/duel-harness';

const track = roomTracker();

afterEach(() => {
  track.closeAll();
});

describe('DuelRoom — ciclo da sala', () => {
  it('sala nova começa vazia e o primeiro jogador fica em espera', () => {
    const { room } = track.room('SALA1');

    expect(room.isEmpty).toBe(true);
    expect(room.isFull).toBe(false);
    expect(room.state).toBe('waiting');
    expect(room.round).toBe(1);
    expect(room.score).toEqual([0, 0]);
    expect(room.lastWinner).toBeNull();
    expect(room.matchWinner).toBeNull();

    const socket = fakeSocket();
    const player = makePlayer(socket, 0, 'a', 'Alpha');
    room.join(player);

    expect(room.players).toHaveLength(1);
    expect(room.isFull).toBe(false);
    expect(room.isEmpty).toBe(false);
    expect(room.state).toBe('waiting');
    expect(lastMessage(socket, 'welcome')).toEqual({
      t: 'welcome',
      id: 'a',
      room: 'SALA1',
      side: 0,
      name: 'Alpha',
    });
    expect(lastMessage(socket, 'queue')).toEqual({ t: 'queue', room: 'SALA1', players: 1 });
    expect(lastMessage(socket, 'matched')).toBeUndefined();
    expect(lastMessage(socket, 'snapshot')).toBeUndefined();
  });

  it('o segundo jogador inicia a partida com welcome, queue, matched e snapshot', () => {
    const { room, sockets, players } = track.match('SALA2');
    const [socketA, socketB] = sockets;
    const [playerA, playerB] = players;

    expect(room.state).toBe('countdown');
    expect(room.stateTimer).toBeCloseTo(DUEL_RULES.countdown, 6);
    expect(room.isFull).toBe(true);
    expect(room.round).toBe(1);
    expect(room.score).toEqual([0, 0]);

    expect(lastMessage(socketA, 'welcome')).toEqual({
      t: 'welcome',
      id: 'p0',
      room: 'SALA2',
      side: 0,
      name: 'Alpha',
    });
    expect(lastMessage(socketB, 'welcome')).toEqual({
      t: 'welcome',
      id: 'p1',
      room: 'SALA2',
      side: 1,
      name: 'Beta',
    });

    // O primeiro só conhece a fila de 1 jogador; o segundo vê a fila cheia.
    expect(lastMessage(socketA, 'queue')).toEqual({ t: 'queue', room: 'SALA2', players: 1 });
    expect(lastMessage(socketB, 'queue')).toEqual({ t: 'queue', room: 'SALA2', players: 2 });

    expect(lastMessage(socketA, 'matched')).toEqual({
      t: 'matched',
      room: 'SALA2',
      side: 0,
      opponent: 'Beta',
      tick: DUEL_TICK_MS,
    });
    expect(lastMessage(socketB, 'matched')).toEqual({
      t: 'matched',
      room: 'SALA2',
      side: 1,
      opponent: 'Alpha',
      tick: DUEL_TICK_MS,
    });

    const snapshotA = lastSnapshot(socketA);
    const snapshotB = lastSnapshot(socketB);
    expect(snapshotA).toBeDefined();
    expect(snapshotB).toBeDefined();
    expect(snapshotA!.state).toBe('countdown');
    expect(snapshotA!.players).toHaveLength(2);

    const snapA = snapshotA!.players.find((p) => p.id === playerA.id)!;
    const snapB = snapshotA!.players.find((p) => p.id === playerB.id)!;
    const spawnA = spawnPoint(0);
    const spawnB = spawnPoint(1);

    expect(snapA.x).toBeCloseTo(spawnA.x, 6);
    expect(snapA.z).toBeCloseTo(spawnA.z, 6);
    expect(snapB.x).toBeCloseTo(spawnB.x, 6);
    expect(snapB.z).toBeCloseTo(spawnB.z, 6);
    expect(snapA.hp).toBe(1);
    expect(snapB.hp).toBe(1);
    expect(snapA.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(snapB.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(snapA.alive).toBe(true);
    expect(snapB.alive).toBe(true);
    expect(snapA.side).toBe(0);
    expect(snapB.side).toBe(1);
  });

  it('join devolve true enquanto há vaga e false quando cheia ou fechada', () => {
    const { room } = track.room('JOIN-RETURN');
    const socketA = fakeSocket();
    const socketB = fakeSocket();
    const socketC = fakeSocket();
    const playerA = makePlayer(socketA, 0, 'a', 'Alpha');
    const playerB = makePlayer(socketB, 1, 'b', 'Beta');
    const playerC = makePlayer(socketC, 1, 'c', 'Gamma');

    expect(room.join(playerA)).toBe(true);
    expect(room.players).toHaveLength(1);
    expect(room.join(playerB)).toBe(true);
    expect(room.players).toHaveLength(2);
    expect(room.join(playerC)).toBe(false);
    expect(room.players).toHaveLength(2);
    expect(socketC.sent).toHaveLength(0);

    room.close();
    const lateSocket = fakeSocket();
    const late = makePlayer(lateSocket, 0, 'late', 'Late');
    expect(room.join(late)).toBe(false);
    expect(lateSocket.sent).toHaveLength(0);
  });

  it('terceiro jogador é recusado silenciosamente quando a sala está cheia', () => {
    const { room } = track.match('CHEIA');
    const extraSocket = fakeSocket();
    const extra = makePlayer(extraSocket, 1, 'p2', 'Gamma');

    room.join(extra);

    expect(room.players).toHaveLength(2);
    expect(room.players.map((p) => p.id)).toEqual(['p0', 'p1']);
    expect(extraSocket.sent).toHaveLength(0);
    expect(room.isFull).toBe(true);
  });

  it('leave do adversário encerra com winner restante e score atual', () => {
    const { room, sockets, players } = track.match('FORFEIT');
    const [socketA, socketB] = sockets;
    const [playerA, playerB] = players;
    room.score = [1, 1];

    room.leave(playerA.id);

    expect(room.players).toHaveLength(1);
    expect(room.players[0]).toBe(playerB);
    expect(room.state).toBe('matchEnd');
    expect(room.matchWinner).toBe(playerB.id);
    expect(room.score).toEqual([1, 1]);
    // The winner stays on the result screen; a decided match must not put
    // them back into the queue for an opponent that no longer exists.
    expect(messagesOf(socketB, 'queue')).toHaveLength(1);
    expect(room.stateTimer).toBe(4);

    // O jogador que saiu tem o socket fechado…
    expect(socketA.closed).toEqual({ code: 1000, reason: 'left' });
    // …o restante continua conectado e recebe o resultado.
    expect(socketB.closed).toBeNull();
    expect(lastMessage(socketB, 'end')).toEqual({
      t: 'end',
      winner: 'p1',
      score: [1, 1],
      reason: 'oponente saiu',
    });

    const snapshot = lastSnapshot(socketB)!;
    expect(snapshot.state).toBe('matchEnd');
    expect(snapshot.matchWinner).toBe('p1');
    expect(snapshot.score).toEqual([1, 1]);
    expect(snapshot.players.map((p) => p.id)).toEqual(['p1']);
  });

  it('leave do adversário também funciona quando quem fica é o lado 0', () => {
    const { room, sockets, players } = track.match('FORFEIT2');
    const [socketA, socketB] = sockets;
    const [playerA, playerB] = players;
    room.score = [2, 0];

    room.leave(playerB.id);

    expect(room.matchWinner).toBe(playerA.id);
    expect(lastMessage(socketA, 'end')).toEqual({
      t: 'end',
      winner: 'p0',
      score: [2, 0],
      reason: 'oponente saiu',
    });
    expect(socketB.closed).toEqual({ code: 1000, reason: 'left' });
    expect(room.players).toHaveLength(1);
  });

  it('leave depois de a sala fechar não reenvia fila nem end', () => {
    const { room, sockets, players } = track.match('CLOSED-LEAVE');
    const [socketB] = sockets;
    const [, playerB] = players;
    room.close();
    const before = socketB.sent.length;

    room.leave(playerB.id);

    expect(room.players).toHaveLength(0);
    expect(socketB.sent.length).toBe(before);
  });

  it('leave desconhecido é ignorado', () => {
    const { room } = track.match('GHOST');

    expect(() => room.leave('nao-existe')).not.toThrow();
    expect(room.players).toHaveLength(2);
    expect(room.state).toBe('countdown');
  });

  it('último jogador saindo fecha a sala e dispara callbacks', () => {
    const harness = track.room('SOLO');
    const socket = fakeSocket();
    const player = makePlayer(socket, 0, 'sozinho', 'Solo');
    harness.room.join(player);

    harness.room.leave(player.id);

    expect(harness.room.isEmpty).toBe(true);
    expect(harness.room.players).toHaveLength(0);
    expect(socket.closed).toEqual({ code: 1000, reason: 'left' });
    expect(harness.emptyCount).toBe(1);
    expect(harness.closedCount).toBe(1);
  });

  it('ping responde pong com o mesmo timestamp e aceita ts não numérico como 0', () => {
    const { room, sockets } = track.match('PING');
    const [socketA] = sockets;

    const before = socketA.sent.length;
    room.ping('fantasma', 42);
    expect(socketA.sent.length).toBe(before);

    room.ping('p0', 1234.5);
    expect(lastMessage(socketA, 'pong')).toEqual({ t: 'pong', ts: 1234.5 });

    room.ping('p0', 'agora');
    expect(lastMessage(socketA, 'pong')).toEqual({ t: 'pong', ts: 0 });
  });

  it('close limpa jogadores, fecha sockets e dispara callbacks uma única vez', () => {
    const harness = track.match('CLOSE');
    const { room, sockets } = harness;
    const [socketA, socketB] = sockets;

    room.close();

    expect(room.isEmpty).toBe(true);
    expect(room.players).toHaveLength(0);
    expect(socketA.closed).toEqual({ code: 1000, reason: 'room closed' });
    expect(socketB.closed).toEqual({ code: 1000, reason: 'room closed' });
    expect(harness.emptyCount).toBe(1);
    expect(harness.closedCount).toBe(1);

    // Idempotente: um segundo close não reemite os callbacks.
    room.close();
    expect(harness.emptyCount).toBe(1);
    expect(harness.closedCount).toBe(1);
  });
});
