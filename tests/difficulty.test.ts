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
    expect(enemyHpFor('gunner', 'impossible')).toBe(2);
  });

  it('aplica bônus de vida e munição sem valores inválidos', () => {
    expect(playerMaxHpFor(1, 'easy')).toBe(2);
    expect(playerMaxHpFor(1, 'hard')).toBe(1);
    expect(playerMaxHpFor(0, 'impossible')).toBe(1);
    expect(startingAmmoFor(6, 'easy')).toBe(8);
    expect(startingAmmoFor(6, 'hard')).toBe(6);
    expect(startingAmmoFor(6, 'impossible')).toBe(5);
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
