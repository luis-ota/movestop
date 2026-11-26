import { describe, expect, it } from 'bun:test';
import { ENEMY_DEFS, LEVELS, expandLevel } from '../src/game/levels';

describe('campanha', () => {
  it('apresenta os novos inimigos com funções distintas', () => {
    expect(ENEMY_DEFS.mortar.label).toBe('ARTILHEIRO');
    expect(ENEMY_DEFS.mortar.bulletSpeed).toBe(0);
    expect(ENEMY_DEFS.warden.label).toBe('MONGE');
    expect(ENEMY_DEFS.warden.bulletSpeed).toBe(0);
  });

  it('liga cada comportamento da IA aos tipos certos', () => {
    // updateEnemies escolhe o comportamento pela presença do bloco de ajuste,
    // então cada bloco precisa existir exatamente nestes tipos.
    const typesWith = (
      key: 'kite' | 'reposition' | 'laser' | 'bash' | 'lunge' | 'mortar' | 'wards' | 'stalk' | 'strike' | 'cloak' | 'ronin',
    ) =>
      Object.values(ENEMY_DEFS)
        .filter((def) => def[key] !== undefined)
        .map((def) => def.type)
        .sort();
    expect(typesWith('kite')).toEqual(['burster', 'gunner', 'mortar', 'warden']);
    expect(typesWith('reposition')).toEqual(['sniper']);
    expect(typesWith('laser')).toEqual(['sniper']);
    expect(typesWith('bash')).toEqual(['shield']);
    expect(typesWith('lunge')).toEqual(['hunter']);
    expect(typesWith('mortar')).toEqual(['mortar']);
    expect(typesWith('wards')).toEqual(['warden']);
    expect(typesWith('stalk')).toEqual(['statue']);
    expect(typesWith('strike')).toEqual(['ninja']);
    expect(typesWith('cloak')).toEqual(['ninja']);
    expect(typesWith('ronin')).toEqual(['ronin']);
  });

  it('a estátua anda no relógio invertido e os outros no do mundo', () => {
    for (const def of Object.values(ENEMY_DEFS)) {
      expect(def.clock ?? 'world').toBe(def.type === 'statue' ? 'inverted' : 'world');
    }
  });

  it('o agarrão da estátua alcança além de onde ela decide agarrar', () => {
    // senão um jogador parado na borda do gatilho nunca seria atingido
    const stalk = ENEMY_DEFS.statue.stalk!;
    expect(stalk.hitRange).toBeGreaterThan(stalk.triggerRange);
    const strike = ENEMY_DEFS.ninja.strike!;
    expect(strike.hitRange).toBeGreaterThan(strike.triggerRange);
    expect(strike.flankOffset).toBeLessThan(strike.triggerRange);
  });

  it('estátua, ninja e ronin ainda não entram na campanha', () => {
    const used = new Set(LEVELS.flatMap((level) => level.waves.flat().map((spawn) => spawn.type)));
    expect(used.has('statue')).toBe(false);
    expect(used.has('ninja')).toBe(false);
    expect(used.has('ronin')).toBe(false);
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
