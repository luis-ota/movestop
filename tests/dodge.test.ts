import { describe, expect, it } from 'bun:test';
import { DODGE_MIN_LEAD, dodgeDirection, dodgeSafeDistance } from '../src/game/dodge';
import { DIFFICULTIES } from '../src/game/difficulty';
import { ENEMY_DEFS } from '../src/game/levels';

describe('desvio de tiros', () => {
  it('só existe no Impossível', () => {
    expect(DIFFICULTIES.easy.enemyDodge).toBe(false);
    expect(DIFFICULTIES.hard.enemyDodge).toBe(false);
    expect(DIFFICULTIES.impossible.enemyDodge).toBe(true);
  });

  it('não vale para quem já tem defesa própria', () => {
    expect(ENEMY_DEFS.shield.dodge).toBeUndefined(); // shield blocks
    expect(ENEMY_DEFS.statue.dodge).toBeUndefined(); // stone is immune
    expect(ENEMY_DEFS.ronin.dodge).toBeUndefined(); // parries every bullet
    expect(ENEMY_DEFS.gunner.dodge).toBeDefined();
  });

  it('desvia de uma bala vindo na direção dele, para o lado', () => {
    // bullet 3 m to the left, flying right at 17.5 m/s, slightly above the enemy's line
    const d = dodgeDirection(0, 0, 0.34, [{ x: -3, z: -0.1, vx: 17.5, vz: 0 }])!;
    expect(d).not.toBeNull();
    expect(Math.abs(d.x)).toBeLessThan(1e-9); // perpendicular to the flight
    expect(d.z).toBeGreaterThan(0); // away from the side the bullet passes
  });

  it('ignora balas que passam longe, que já passaram ou que ainda estão longe demais', () => {
    expect(dodgeDirection(0, 0, 0.34, [{ x: -3, z: 2, vx: 17.5, vz: 0 }])).toBeNull(); // wide miss
    expect(dodgeDirection(0, 0, 0.34, [{ x: 1, z: 0, vx: 17.5, vz: 0 }])).toBeNull(); // flying away
    expect(dodgeDirection(0, 0, 0.34, [{ x: -20, z: 0, vx: 17.5, vz: 0 }])).toBeNull(); // > horizon
  });

  it('com uma bala bem no centro usa o lado preferido', () => {
    const left = dodgeDirection(0, 0, 0.34, [{ x: -3, z: 0, vx: 17.5, vz: 0 }], -1)!;
    const right = dodgeDirection(0, 0, 0.34, [{ x: -3, z: 0, vx: 17.5, vz: 0 }], 1)!;
    expect(left.z).toBe(-right.z);
  });

  const reaction = ENEMY_DEFS.gunner.dodge!.reaction;
  const PLAYER_BULLET = 17.5;

  it('não desvia de uma bala que ainda não teve tempo de ler', () => {
    const fresh = { x: -6, z: -0.1, vx: PLAYER_BULLET, vz: 0, age: reaction * 0.5 };
    expect(dodgeDirection(0, 0, 0.34, [fresh], 1, reaction)).toBeNull();
    const read = { ...fresh, age: reaction };
    expect(dodgeDirection(0, 0, 0.34, [read], 1, reaction)).not.toBeNull();
  });

  it('tiro à queima-roupa sempre acerta: chega antes da reação', () => {
    // fired 3 m away: by the time it is read it is already inside the minimum lead
    const fired = { x: -3, z: 0, vx: PLAYER_BULLET, vz: 0 };
    const flight = 3 / PLAYER_BULLET;
    expect(flight).toBeLessThan(reaction + DODGE_MIN_LEAD);
    // simulate the flight frame by frame (60 Hz world time): no frame ever dodges
    let dodged = false;
    for (let t = 0; t < flight; t += 1 / 60) {
      const b = { x: fired.x + fired.vx * t, z: 0, vx: fired.vx, vz: 0, age: t };
      if (dodgeDirection(0, 0, 0.34, [b], 1, reaction)) dodged = true;
    }
    expect(dodged).toBe(false);
  });

  it('de longe desvia cedo, com folga, e não no último instante', () => {
    let firstT = -1;
    let remaining = 0;
    for (let t = 0; t < 1; t += 1 / 60) {
      const b = { x: -12 + PLAYER_BULLET * t, z: 0, vx: PLAYER_BULLET, vz: 0, age: t };
      if (dodgeDirection(0, 0, 0.34, [b], 1, reaction)) {
        firstT = t;
        remaining = -b.x / PLAYER_BULLET;
        break;
      }
    }
    expect(firstT).toBeGreaterThanOrEqual(reaction);
    expect(remaining).toBeGreaterThan(0.3); // time left for the step to clear
  });

  it('a distância segura para o jogador fica no meio da arena, não no canto', () => {
    const d = dodgeSafeDistance(PLAYER_BULLET, reaction);
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(7);
    // the cooldown leaves room for a follow-up shot
    expect(ENEMY_DEFS.gunner.dodge!.cooldown).toBeGreaterThanOrEqual(1.5);
  });
});
