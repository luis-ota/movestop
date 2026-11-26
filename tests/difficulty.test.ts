import { describe, expect, it } from 'bun:test';
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  bossHpFor,
  enemyHpFor,
  getDifficulty,
  isDifficulty,
  playerMaxHpFor,
  startingAmmoFor,
} from '../src/game/difficulty';

describe('difficulty', () => {
  it('expõe os três modos na ordem esperada', () => {
    expect(DIFFICULTY_ORDER).toEqual(['easy', 'hard', 'impossible']);
    expect(DIFFICULTIES.easy.label).toBe('Fácil');
    expect(DIFFICULTIES.hard.label).toBe('Difícil');
    expect(DIFFICULTIES.impossible.label).toBe('Impossível');
  });

  it('valida e normaliza ids', () => {
    expect(isDifficulty('easy')).toBe(true);
    expect(isDifficulty('hard')).toBe(true);
    expect(isDifficulty('impossible')).toBe(true);
    expect(isDifficulty('normal')).toBe(false);
    expect(getDifficulty(undefined).id).toBe('hard');
    expect(getDifficulty('easy').id).toBe('easy');
  });

  it('escudo leva dois tiros, ou um corte que ainda usa killEnemy', () => {
    expect(enemyHpFor('shield', 'easy')).toBe(2);
    expect(enemyHpFor('shield', 'hard')).toBe(2);
    expect(enemyHpFor('shield', 'impossible')).toBe(2);
    expect(enemyHpFor('gunner', 'hard')).toBe(1);
    expect(enemyHpFor('gunner', 'impossible')).toBe(3);
    expect(enemyHpFor('mortar', 'hard')).toBe(2);
    expect(enemyHpFor('warden', 'impossible')).toBe(4);
  });

  it('a estátua de pedra tem vida fixa; o ninja escala como os outros', () => {
    expect(enemyHpFor('statue', 'easy')).toBe(2);
    expect(enemyHpFor('statue', 'impossible')).toBe(2);
    expect(enemyHpFor('ninja', 'hard')).toBe(1);
    expect(enemyHpFor('ninja', 'impossible')).toBe(3);
  });

  it('aperta aparo, invulnerabilidade e contato no Impossível', () => {
    expect(DIFFICULTIES.easy.parryWindow).toBeGreaterThan(DIFFICULTIES.hard.parryWindow);
    expect(DIFFICULTIES.hard.parryWindow).toBeGreaterThan(DIFFICULTIES.impossible.parryWindow);
    expect(DIFFICULTIES.impossible.parryRecovery).toBeGreaterThan(DIFFICULTIES.hard.parryRecovery);
    expect(DIFFICULTIES.impossible.invulnTime).toBeLessThan(DIFFICULTIES.hard.invulnTime);
    expect(DIFFICULTIES.easy.contactDamage).toBe(false);
    expect(DIFFICULTIES.hard.contactDamage).toBe(false);
    expect(DIFFICULTIES.impossible.contactDamage).toBe(true);
  });

  it('aplica bônus de vida e munição sem valores inválidos', () => {
    expect(playerMaxHpFor(1, 'easy')).toBe(2);
    expect(playerMaxHpFor(1, 'hard')).toBe(1);
    expect(playerMaxHpFor(0, 'impossible')).toBe(1);
    expect(startingAmmoFor(6, 'easy')).toBe(8);
    expect(startingAmmoFor(6, 'hard')).toBe(6);
    expect(startingAmmoFor(6, 'impossible')).toBe(4);
    expect(startingAmmoFor(2, 'impossible')).toBe(3);
  });

  it('aumenta agressividade e resistência do chefe progressivamente', () => {
    expect(DIFFICULTIES.hard.enemyFireMult).toBeLessThan(DIFFICULTIES.easy.enemyFireMult);
    expect(DIFFICULTIES.impossible.enemyFireMult).toBeLessThan(DIFFICULTIES.hard.enemyFireMult);
    expect(DIFFICULTIES.impossible.enemySpeedMult).toBeGreaterThan(DIFFICULTIES.hard.enemySpeedMult);
    expect(bossHpFor(14, 'easy')).toBeLessThan(bossHpFor(14, 'hard'));
    expect(bossHpFor(14, 'impossible')).toBeGreaterThan(bossHpFor(14, 'hard'));
  });
});
