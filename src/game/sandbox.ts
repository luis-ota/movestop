import { expandLevel, type LevelDef } from './levels';

/**
 * Dev-only test arena: no waves, no progress, no rewards. The authored core
 * has walls, crates (x), barrels (b) and cracked rocks (R) so line of sight,
 * cover and explosions can be checked against every enemy. `expandLevel`
 * then grows it into the same open field the campaign uses.
 */
const SANDBOX_CORE: LevelDef = {
  id: 0,
  act: 0,
  name: 'SANDBOX',
  subtitle: 'Arena de testes',
  grid: [
    '#################',
    '#...............#',
    '#..x.....#....b.#',
    '#........#......#',
    '#..##.......R...#',
    '#...............#',
    '#.....b...x.....#',
    '#...............#',
    '#..R.......##...#',
    '#...............#',
    '#.......P.......#',
    '#...............#',
    '#################',
  ],
  ammo: 8,
  par: 0,
  reward: 0,
  waves: [],
  fireScale: 1,
  speedScale: 1,
  hint: '',
};

export function buildSandboxLevel(): LevelDef {
  return expandLevel(SANDBOX_CORE, 9);
}
