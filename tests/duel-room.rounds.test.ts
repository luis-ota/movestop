import { afterEach, describe, expect, it } from 'bun:test';
import { ACTIONS, DUEL_RULES, DUEL_ROUNDS_TO_WIN, spawnPoint } from '../src/shared/duel';
import {
  act,
  enterLive,
  forceSnapshot,
  lastMessage,
  lastSnapshot,
  messagesOf,
  place,
  roomTracker,
  stepRoom,
} from './support/duel-harness';

const track = roomTracker();

afterEach(() => {
  track.closeAll();
});

describe('DuelRoom — rounds e fim de partida', () => {
  it('countdown vira live depois do tempo configurado', () => {
    const { room } = track.match('COUNTDOWN');
    expect(room.state).toBe('countdown');

    let ticks = 0;
    while (room.state === 'countdown' && ticks < 200) {
      stepRoom(room, 1);
      ticks += 1;
    }

    expect(room.state).toBe('live');
    expect(room.stateTimer).toBe(0);
    expect(ticks).toBeGreaterThanOrEqual(DUEL_RULES.countdown * 30 - 1);
    expect(ticks).toBeLessThanOrEqual(DUEL_RULES.countdown * 30 + 1);
  });

  it('roundEnd espera roundDelay e o próximo round reseta hp, ammo e posições', () => {
    const { room, sockets, players } = track.match('RESET');
    enterLive(room);
    const [socketA] = sockets;
    const [playerA, playerB] = players;
    place(playerA, -1.5, -3, [1, 0]);
    place(playerB, 0, -3, [0, 1]);
    playerA.ammo = 1;
    playerB.ammo = 0;

    // Um tiro fica no ar, e o slash encerra o round.
    act(room, playerA, 1, ACTIONS.shoot);
    expect(forceSnapshot(room).bullets).toHaveLength(1);
    act(room, playerA, 2, ACTIONS.slash);

    expect(room.state).toBe('roundEnd');
    expect(room.round).toBe(2);
    expect(room.score).toEqual([1, 0]);
    expect(playerB.alive).toBe(false);
    expect(playerB.hp).toBe(0);
    expect(forceSnapshot(room).bullets).toHaveLength(1);
    const focusAAfterKill = playerA.focus;
    const focusBAfterKill = playerB.focus;

    let ticks = 0;
    while (room.state === 'roundEnd' && ticks < 200) {
      stepRoom(room, 1);
      ticks += 1;
    }

    expect(ticks).toBeGreaterThanOrEqual(DUEL_RULES.roundDelay * 30 - 1);
    expect(ticks).toBeLessThanOrEqual(DUEL_RULES.roundDelay * 30 + 1);
    expect(room.state).toBe('countdown');
    expect(room.stateTimer).toBeCloseTo(DUEL_RULES.countdown, 6);
    expect(room.round).toBe(2);
    expect(room.score).toEqual([1, 0]);
    expect(room.lastWinner).toBe(playerA.id);

    const spawnA = spawnPoint(0);
    const spawnB = spawnPoint(1);
    expect(playerA.x).toBeCloseTo(spawnA.x, 9);
    expect(playerA.z).toBeCloseTo(spawnA.z, 9);
    expect(playerB.x).toBeCloseTo(spawnB.x, 9);
    expect(playerB.z).toBeCloseTo(spawnB.z, 9);
    expect(playerA.vx).toBe(0);
    expect(playerA.vz).toBe(0);
    expect(playerB.vx).toBe(0);
    expect(playerB.vz).toBe(0);
    expect(playerA.hp).toBe(1);
    expect(playerB.hp).toBe(1);
    expect(playerA.alive).toBe(true);
    expect(playerB.alive).toBe(true);
    expect(playerA.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(playerB.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(playerA.invuln).toBeCloseTo(DUEL_RULES.spawnInvuln, 9);
    expect(playerB.invuln).toBeCloseTo(DUEL_RULES.spawnInvuln, 9);
    expect(playerA.focus).toBe(Math.min(DUEL_RULES.focusMax, focusAAfterKill + 20));
    expect(playerB.focus).toBe(Math.min(DUEL_RULES.focusMax, focusBAfterKill + 20));
    expect(playerA.angle).toBeCloseTo(Math.PI / 2, 9);
    expect(playerB.angle).toBeCloseTo(-Math.PI / 2, 9);

    expect(forceSnapshot(room).bullets).toHaveLength(0);
    expect(messagesOf(socketA, 'event').some((e: any) => e.kind === 'spawn')).toBe(true);
    expect(lastSnapshot(socketA)!.state).toBe('countdown');
  });

  it('vitória do lado 1 incrementa score[1] e define lastWinner', () => {
    const { room, players } = track.match('SIDE1');
    enterLive(room);
    const [playerA, playerB] = players;
    place(playerA, 0, -3, [0, 1]);
    place(playerB, -1.5, -3, [1, 0]);

    act(room, playerB, 1, ACTIONS.slash);

    expect(playerA.hp).toBe(0);
    expect(room.score).toEqual([0, 1]);
    expect(room.lastWinner).toBe(playerB.id);
    expect(room.state).toBe('roundEnd');
    expect(room.round).toBe(2);
  });

  it('melhor de cinco: três abates reais encerram a partida em 3-0', () => {
    const { room, players } = track.match('BO5');
    const [winner, loser] = players;

    for (let round = 1; round <= DUEL_ROUNDS_TO_WIN; round += 1) {
      enterLive(room);
      place(winner, -1.5, -3, [1, 0]);
      place(loser, 0, -3, [0, 1]);
      act(room, winner, round, ACTIONS.slash);

      expect(room.score).toEqual([round, 0]);
      expect(loser.alive).toBe(false);

      if (round < DUEL_ROUNDS_TO_WIN) {
        expect(room.state).toBe('roundEnd');
        let ticks = 0;
        while (room.state === 'roundEnd' && ticks < 200) {
          stepRoom(room, 1);
          ticks += 1;
        }
        expect(room.state).toBe('countdown');
        expect(room.round).toBe(round + 1);
      }
    }

    expect(room.state).toBe('matchEnd');
    expect(room.matchWinner).toBe(winner.id);
    expect(room.score).toEqual([DUEL_ROUNDS_TO_WIN, 0]);
    expect(messagesOf(room.players[0].ws as any, 'end')[0]).toEqual({
      t: 'end',
      winner: winner.id,
      score: [DUEL_ROUNDS_TO_WIN, 0],
      reason: 'melhor de cinco',
    });
  });

  it('primeiro a 3 vence: matchEnd, end imediato e fechamento após o timer', () => {
    const harness = track.match('MATCH-END');
    const { room, sockets, players } = harness;
    enterLive(room);
    const [socketA, socketB] = sockets;
    const [winner, loser] = players;
    room.score = [DUEL_ROUNDS_TO_WIN - 1, 0];
    place(winner, -1.5, -3, [1, 0]);
    place(loser, 0, -3, [0, 1]);

    act(room, winner, 1, ACTIONS.slash);

    expect(loser.alive).toBe(false);
    expect(room.score).toEqual([DUEL_ROUNDS_TO_WIN, 0]);
    expect(room.state).toBe('matchEnd');
    expect(room.stateTimer).toBe(4);
    expect(room.matchWinner).toBe(winner.id);
    expect(room.lastWinner).toBe(winner.id);
    expect(room.round).toBe(1); // a partida acaba antes de abrir outro round

    const endMessages = messagesOf(socketA, 'end');
    expect(endMessages).toHaveLength(1);
    expect(endMessages[0]).toEqual({
      t: 'end',
      winner: winner.id,
      score: [DUEL_ROUNDS_TO_WIN, 0],
      reason: 'melhor de cinco',
    });
    expect(messagesOf(socketB, 'end')).toHaveLength(1);
    expect(messagesOf(socketA, 'event').some((e: any) => e.kind === 'match' && e.who === winner.id)).toBe(true);

    const snapshot = lastSnapshot(socketA)!;
    expect(snapshot.state).toBe('matchEnd');
    expect(snapshot.matchWinner).toBe(winner.id);
    expect(snapshot.score).toEqual([DUEL_ROUNDS_TO_WIN, 0]);

    let ticks = 0;
    while (!room.isEmpty && ticks < 300) {
      stepRoom(room, 1);
      ticks += 1;
    }

    expect(ticks).toBeGreaterThanOrEqual(4 * 30 - 1);
    expect(ticks).toBeLessThanOrEqual(4 * 30 + 2);
    expect(room.isEmpty).toBe(true);
    expect(room.players).toHaveLength(0);
    expect(harness.emptyCount).toBe(1);
    expect(harness.closedCount).toBe(1);
    expect(socketA.closed).toEqual({ code: 1000, reason: 'room closed' });
    expect(socketB.closed).toEqual({ code: 1000, reason: 'room closed' });

    const allEnds = messagesOf(socketA, 'end');
    expect(allEnds).toHaveLength(2);
    expect(allEnds[1]).toEqual({
      t: 'end',
      winner: winner.id,
      score: [DUEL_ROUNDS_TO_WIN, 0],
      reason: 'fim da partida',
    });
    expect(lastMessage(socketA, 'snapshot')).toBeDefined();
  });
});
