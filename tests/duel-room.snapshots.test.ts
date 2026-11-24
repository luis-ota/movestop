import { afterEach, describe, expect, it } from 'bun:test';
import { ACTIONS, DUEL_RULES } from '../src/shared/duel';
import {
  act,
  enterLive,
  forceSnapshot,
  place,
  roomTracker,
} from './support/duel-harness';

const track = roomTracker();

afterEach(() => {
  track.closeAll();
});

describe('DuelRoom — snapshots', () => {
  it('snapshot é serializável, usa arrays e não vaza socket nem estado privado', () => {
    const { room } = track.match('SNAP-SHAPE');
    const snapshot = forceSnapshot(room);

    expect(snapshot.t).toBe('snapshot');
    expect(Object.keys(snapshot).sort()).toEqual([
      'bullets',
      'lastWinner',
      'matchWinner',
      'players',
      'round',
      'score',
      'serverTime',
      'state',
      'stateTimer',
      't',
      'tick',
      'timeScale',
    ]);
    expect(Array.isArray(snapshot.players)).toBe(true);
    expect(Array.isArray(snapshot.bullets)).toBe(true);
    expect(snapshot.players).toHaveLength(2);
    expect(snapshot.bullets).toHaveLength(0);
    expect(snapshot.tick).toBe(room.tick);
    expect(snapshot.round).toBe(room.round);
    expect(snapshot.state).toBe(room.state);
    expect(snapshot.score).toEqual([0, 0]);
    expect(snapshot.lastWinner).toBeNull();
    expect(snapshot.matchWinner).toBeNull();
    expect(Number.isFinite(snapshot.serverTime)).toBe(true);
    expect(Number.isFinite(snapshot.stateTimer)).toBe(true);
    expect(Number.isFinite(snapshot.timeScale)).toBe(true);

    const playerKeys = [
      'alive',
      'ammo',
      'angle',
      'dash',
      'firing',
      'focus',
      'hp',
      'id',
      'invuln',
      'name',
      'parry',
      'side',
      'skin',
      'x',
      'z',
    ];
    for (const snapPlayer of snapshot.players) {
      expect(Object.keys(snapPlayer).sort()).toEqual(playerKeys);
      expect('ws' in snapPlayer).toBe(false);
      expect('vx' in snapPlayer).toBe(false);
      expect('vz' in snapPlayer).toBe(false);
      expect('aim' in snapPlayer).toBe(false);
      expect('move' in snapPlayer).toBe(false);
      expect('lastInputSeq' in snapPlayer).toBe(false);
      expect('lastActionId' in snapPlayer).toBe(false);

      const serverPlayer = room.players.find((p) => p.id === snapPlayer.id)!;
      expect(snapPlayer.x).toBe(serverPlayer.x);
      expect(snapPlayer.z).toBe(serverPlayer.z);
      expect(snapPlayer.angle).toBe(serverPlayer.angle);
      expect(snapPlayer.hp).toBe(serverPlayer.hp);
      expect(snapPlayer.ammo).toBe(serverPlayer.ammo);
      expect(snapPlayer.focus).toBe(serverPlayer.focus);
      expect(snapPlayer.alive).toBe(serverPlayer.alive);
      expect(snapPlayer.side).toBe(serverPlayer.side);
      expect(snapPlayer.name).toBe(serverPlayer.name);
    }

    const json = JSON.stringify(snapshot);
    expect(json).not.toContain('"ws"');
    const reparsed = JSON.parse(json);
    expect(reparsed.t).toBe('snapshot');
    expect(reparsed.players).toHaveLength(2);
    expect(Array.isArray(reparsed.bullets)).toBe(true);
    expect(JSON.stringify(reparsed)).toBe(json);
  });

  it('bullet no snapshot expõe só campos públicos e mantém owner/posição', () => {
    const { room, players } = track.match('SNAP-BULLET');
    enterLive(room);
    const [player] = players;
    place(player, -2, -3, [1, 0]);
    act(room, player, 1, ACTIONS.shoot);

    const snapshot = forceSnapshot(room);
    expect(snapshot.bullets).toHaveLength(1);
    const bullet = snapshot.bullets[0];

    expect(Object.keys(bullet).sort()).toEqual(['angle', 'id', 'life', 'owner', 'speed', 'x', 'z']);
    expect('vx' in bullet).toBe(false);
    expect('vz' in bullet).toBe(false);
    expect(bullet.owner).toBe(player.id);
    expect(Number.isFinite(bullet.id)).toBe(true);
    expect(Number.isFinite(bullet.x)).toBe(true);
    expect(Number.isFinite(bullet.z)).toBe(true);
    expect(Number.isFinite(bullet.angle)).toBe(true);
    expect(bullet.speed).toBe(DUEL_RULES.bulletSpeed);
    expect(bullet.life).toBeGreaterThan(0);

    const reparsed = JSON.parse(JSON.stringify(snapshot));
    expect(reparsed.bullets).toHaveLength(1);
    expect(reparsed.bullets[0]).toEqual(snapshot.bullets[0]);
  });

  it('snapshot reflete cooldowns derivados e o resultado do round', () => {
    const { room, players } = track.match('SNAP-STATE');
    enterLive(room);
    const [attacker, target] = players;

    attacker.dashCd = DUEL_RULES.dashCooldown / 2;
    attacker.parryCd = DUEL_RULES.parryCooldown / 4;
    target.dashCd = 0;
    target.parryCd = 0;

    const cooldownSnapshot = forceSnapshot(room);
    const attackerSnap = cooldownSnapshot.players.find((p) => p.id === attacker.id)!;
    const targetSnap = cooldownSnapshot.players.find((p) => p.id === target.id)!;
    expect(attackerSnap.dash).toBeCloseTo(0.5, 9);
    expect(attackerSnap.parry).toBeCloseTo(0.75, 9);
    expect(targetSnap.dash).toBe(1);
    expect(targetSnap.parry).toBe(1);
    expect(JSON.stringify(cooldownSnapshot)).toContain('"dash":0.5');

    place(attacker, -1.5, -3, [1, 0]);
    place(target, 0, -3, [0, 1]);
    act(room, attacker, 1, ACTIONS.slash);

    const endSnapshot = forceSnapshot(room);
    expect(endSnapshot.state).toBe('roundEnd');
    expect(endSnapshot.round).toBe(2);
    expect(endSnapshot.score).toEqual([1, 0]);
    expect(endSnapshot.lastWinner).toBe(attacker.id);
    expect(endSnapshot.matchWinner).toBeNull();
    expect(endSnapshot.players.find((p) => p.id === target.id)!.hp).toBe(0);
    expect(endSnapshot.players.find((p) => p.id === target.id)!.alive).toBe(false);
    expect(endSnapshot.players.find((p) => p.id === attacker.id)!.alive).toBe(true);
    expect(JSON.parse(JSON.stringify(endSnapshot))).toEqual(endSnapshot);
  });
});
