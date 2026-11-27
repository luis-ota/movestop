import { describe, expect, it } from 'bun:test';
import { ENEMY_DEFS, LEVELS, expandLevel } from '../src/game/levels';
import type { Box } from '../src/game/movement';
import { NavGrid } from '../src/game/navigation';

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

  const types = (id: number) => LEVELS.find((level) => level.id === id)!.waves.flat().map((spawn) => spawn.type);

  it('são nove fases, três por ato, com ids em ordem e o chefe por último', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const act of [1, 2, 3]) expect(LEVELS.filter((l) => l.act === act)).toHaveLength(3);
    expect(LEVELS[LEVELS.length - 1].boss).toBeDefined();
    expect(LEVELS.filter((l) => l.boss)).toHaveLength(1);
  });

  it('introduz morteiro e monge em fases diferentes', () => {
    expect(types(4)).toContain('mortar');
    expect(types(4)).not.toContain('warden');
    expect(types(8)).toContain('mortar');
    expect(types(8)).toContain('warden');
  });

  it('a Estátua chega na Sala de Espera e a Sombra no Vidro Fumê', () => {
    expect(types(4)).toContain('statue');
    expect(types(6)).toContain('ninja');
    // the siege promises every type
    expect(types(8)).toEqual(expect.arrayContaining(['statue', 'ninja', 'hunter', 'shield', 'sniper', 'mortar', 'warden']));
  });

  it('o Ronin luta sozinho, num duelo sem balas, antes do Cerco', () => {
    const duel = LEVELS.find((l) => l.id === 7)!;
    expect(types(7)).toEqual(['ronin']);
    expect(duel.ammo).toBe(0);
    expect(duel.noAmmoDrops).toBe(true);
    // no field extras sneak into the duel when the arena is expanded
    expect(expandLevel(duel, 9).waves.flat().map((s) => s.type)).toEqual(['ronin']);
    expect(LEVELS.find((l) => l.id === 8)!.name).toBe('CERCO');
  });

  it('todo inimigo nasce em chão livre e consegue chegar ao jogador', () => {
    for (const authored of LEVELS) {
      const level = expandLevel(authored, 9);
      const rows = level.grid.length;
      const cols = level.grid[0].length;
      const halfW = (cols - 1) / 2;
      const halfH = (rows - 1) / 2;
      const boxes: Box[] = [];
      level.grid.forEach((row, r) =>
        [...row].forEach((ch, c) => {
          if (!'#xbR'.includes(ch)) return; // walls, crates, barrels, rocks
          boxes.push({ minX: c - halfW - 0.5, maxX: c - halfW + 0.5, minZ: r - halfH - 0.5, maxZ: r - halfH + 0.5, active: true });
        }),
      );
      const pr = level.grid.findIndex((row) => row.includes('P'));
      const player = { x: level.grid[pr].indexOf('P') - halfW, z: pr - halfH };
      const nav = new NavGrid(cols, rows);
      nav.update(boxes, player.x, player.z);
      for (const spawn of level.waves.flat()) {
        const [r, c] = spawn.at;
        const where = `fase ${authored.id}, ${spawn.type} em [${r},${c}]`;
        expect({ where, cell: level.grid[r]?.[c] }).toEqual({ where, cell: expect.stringMatching(/^[.oP]$/) });
        const reach = nav.distanceAt(nav.cellOf(c - halfW, r - halfH));
        expect({ where, reachable: Number.isFinite(reach) }).toEqual({ where, reachable: true });
      }
    }
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
