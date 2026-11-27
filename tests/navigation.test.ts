import { describe, expect, it } from 'bun:test';
import type { Box } from '../src/game/movement';
import { NavGrid } from '../src/game/navigation';

/** Builds solids from an ASCII map ('#' = 1 m wall cell), like the level grids. */
function arena(map: string[]) {
  const rows = map.length;
  const cols = map[0].length;
  const halfW = (cols - 1) / 2;
  const halfH = (rows - 1) / 2;
  const boxes: Box[] = [];
  map.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch !== '#') return;
      const x = c - halfW;
      const z = r - halfH;
      boxes.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5, active: true });
    }),
  );
  const at = (ch: string) => {
    const r = map.findIndex((row) => row.includes(ch));
    return { x: map[r].indexOf(ch) - halfW, z: r - halfH };
  };
  return { nav: new NavGrid(cols, rows), boxes, at };
}

/** Walks a body along the nav directions (like seekEnemy, with collisions ignored). */
function walk(nav: NavGrid, boxes: Box[], from: { x: number; z: number }, to: { x: number; z: number }, steps = 400) {
  const p = { ...from };
  nav.update(boxes, to.x, to.z);
  for (let i = 0; i < steps; i++) {
    if (Math.hypot(to.x - p.x, to.z - p.z) < 0.5) return { reached: true, steps: i, p };
    const d = nav.direction(boxes, p.x, p.z, 0.34, to.x, to.z);
    if (!d) break;
    p.x += d.x * 0.1;
    p.z += d.z * 0.1;
    // never step into a wall
    for (const b of boxes) if (p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ) return { reached: false, steps: i, p, insideWall: true };
  }
  return { reached: false, steps, p };
}

describe('navegação dos inimigos', () => {
  it('anda reto quando o caminho está livre', () => {
    const { nav, boxes, at } = arena(['#######', '#E...P#', '#######']);
    nav.update(boxes, at('P').x, at('P').z);
    const d = nav.direction(boxes, at('E').x, at('E').z, 0.34, at('P').x, at('P').z)!;
    expect(d.x).toBeCloseTo(1, 5);
    expect(d.z).toBeCloseTo(0, 5);
  });

  it('sai de uma cobertura em U em vez de empurrar a parede', () => {
    const { nav, boxes, at } = arena([
      '###########',
      '#.........#',
      '#..#####..#',
      '#..#.E.#..#',
      '#..#...#..#',
      '#.........#',
      '#.........#',
      '#....P....#',
      '###########',
    ]);
    // E sits inside a cup closed toward the top; the way out is the open bottom
    const r = walk(nav, boxes, at('E'), at('P'));
    expect(r.reached).toBe(true);
  });

  it('contorna uma parede comprida pelo lado mais curto', () => {
    const { nav, boxes, at } = arena([
      '#############',
      '#.....E.....#',
      '#...........#',
      '#.#########.#',
      '#...........#',
      '#.P.........#',
      '#############',
    ]);
    nav.update(boxes, at('P').x, at('P').z);
    const d = nav.direction(boxes, at('E').x, at('E').z, 0.34, at('P').x, at('P').z)!;
    expect(d.x).toBeLessThan(0); // the player is on the left: go around the left end
    expect(walk(nav, boxes, at('E'), at('P')).reached).toBe(true);
  });

  it('não corta quina entre duas paredes na diagonal', () => {
    const { nav, boxes, at } = arena([
      '######',
      '#E.#.#',
      '#.#..#',
      '#...P#',
      '######',
    ]);
    const r = walk(nav, boxes, at('E'), at('P'));
    expect(r.reached).toBe(true);
    expect((r as { insideWall?: boolean }).insideWall).toBeUndefined();
  });

  it('refaz o mapa quando uma pedra quebra e abre passagem', () => {
    const { nav, boxes, at } = arena([
      '#######',
      '#E.#.P#',
      '#######',
    ]);
    nav.update(boxes, at('P').x, at('P').z);
    const blocked = nav.direction(boxes, at('E').x, at('E').z, 0.34, at('P').x, at('P').z);
    expect(blocked).toBeNull(); // no path at all: the caller keeps its old behaviour
    const rock = boxes.find((b) => Math.abs((b.minX + b.maxX) / 2) < 0.01 && Math.abs((b.minZ + b.maxZ) / 2) < 0.01)!;
    rock.active = false; // destroyed
    nav.update(boxes, at('P').x, at('P').z);
    const open = nav.direction(boxes, at('E').x, at('E').z, 0.34, at('P').x, at('P').z)!;
    expect(open.x).toBeCloseTo(1, 3);
  });

  it('é barato: campo de uma arena grande em poucos milissegundos', () => {
    const map = Array.from({ length: 31 }, (_, r) =>
      Array.from({ length: 35 }, (_, c) => (r === 0 || c === 0 || r === 30 || c === 34 || (c % 6 === 3 && r % 5 !== 0) ? '#' : '.')).join(''),
    );
    const { nav, boxes } = arena(map);
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) nav.update(boxes, (i % 20) - 10, (i % 14) - 7);
    expect((performance.now() - t0) / 50).toBeLessThan(5);
  });
});
