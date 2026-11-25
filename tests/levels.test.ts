import { describe, expect, it } from 'bun:test';
import { ENEMY_DEFS, LEVELS, expandLevel } from '../src/game/levels';

describe('campanha', () => {
  it('apresenta os novos inimigos com funções distintas', () => {
    expect(ENEMY_DEFS.mortar.label).toBe('ARTILHEIRO');
    expect(ENEMY_DEFS.mortar.bulletSpeed).toBe(0);
    expect(ENEMY_DEFS.warden.label).toBe('MONGE');
    expect(ENEMY_DEFS.warden.bulletSpeed).toBe(0);
  });

  it('introduz morteiro e monge em fases diferentes', () => {
    const types = (id: number) => LEVELS.find((level) => level.id === id)!.waves.flat().map((spawn) => spawn.type);
    expect(types(4)).toContain('mortar');
    expect(types(4)).not.toContain('warden');
    expect(types(7)).toContain('mortar');
    expect(types(7)).toContain('warden');
  });

  it('preserva pedras destrutíveis ao expandir a arena', () => {
    const expanded = expandLevel(LEVELS[3], 9);
    expect(expanded.grid.some((row) => row.includes('R'))).toBe(true);
    expect(expanded.grid.every((row) => row.length === expanded.grid[0].length)).toBe(true);
  });

  it('mantém a fase desarmada sem munição e sem drops', () => {
    const unarmed = expandLevel(LEVELS[2], 9);
    expect(unarmed.ammo).toBe(0);
    expect(unarmed.noAmmoDrops).toBe(true);
  });
});
