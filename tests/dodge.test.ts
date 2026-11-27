import { describe, expect, it } from 'bun:test';
import { dodgeDirection } from '../src/game/dodge';
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
});
