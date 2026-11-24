export type EnemyType = 'gunner' | 'burster' | 'sniper' | 'shield' | 'hunter';

export interface EnemyDef {
  type: EnemyType;
  label: string;
  hp: number;
  radius: number;
  fireEvery: number;
  windup: number;
  bulletSpeed: number;
  lead: number;
  burst: number;
  burstGap: number;
  spread: number;
  moveSpeed: number;
  strafe: number;
  sightRange: number;
  color: number;
  body: number;
  scale: number;
}

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  gunner: {
    type: 'gunner',
    label: 'ATIRADOR',
    hp: 1,
    radius: 0.34,
    fireEvery: 2.35,
    windup: 0.62,
    bulletSpeed: 6.4,
    lead: 0.03,
    burst: 1,
    burstGap: 0.14,
    spread: 0.055,
    moveSpeed: 0.4,
    strafe: 0.5,
    sightRange: 24,
    color: 0xe23b2e,
    body: 0xc93227,
    scale: 1,
  },
  burster: {
    type: 'burster',
    label: 'RAJADA',
    hp: 1,
    radius: 0.34,
    fireEvery: 2.9,
    windup: 0.55,
    bulletSpeed: 6.1,
    lead: 0.05,
    burst: 3,
    burstGap: 0.14,
    spread: 0.07,
    moveSpeed: 0.32,
    strafe: 0.32,
    sightRange: 24,
    color: 0xff7a1a,
    body: 0xe06a12,
    scale: 0.96,
  },
  sniper: {
    type: 'sniper',
    label: 'PRECISÃO',
    hp: 1,
    radius: 0.34,
    fireEvery: 4.4,
    windup: 1.5,
    bulletSpeed: 15.5,
    lead: 0.08,
    burst: 1,
    burstGap: 0.2,
    spread: 0.008,
    moveSpeed: 0,
    strafe: 0,
    sightRange: 30,
    color: 0xff3d9a,
    body: 0x9b1a5e,
    scale: 1,
  },
  shield: {
    type: 'shield',
    label: 'ESCUDO',
    hp: 1,
    radius: 0.38,
    fireEvery: 3.0,
    windup: 0.7,
    bulletSpeed: 5.6,
    lead: 0.02,
    burst: 1,
    burstGap: 0.18,
    spread: 0.05,
    moveSpeed: 0.62,
    strafe: 0,
    sightRange: 24,
    color: 0xd63a2a,
    body: 0x7f2a22,
    scale: 1.08,
  },
  hunter: {
    type: 'hunter',
    label: 'CAÇADOR',
    hp: 1,
    radius: 0.33,
    fireEvery: 99,
    windup: 0,
    bulletSpeed: 0,
    lead: 0,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 2.2,
    strafe: 0,
    sightRange: 40,
    color: 0xff9a1f,
    body: 0xcc5f0e,
    scale: 0.92,
  },
};

export interface Spawn {
  type: EnemyType;
  /** [row, col] on the grid */
  at: [number, number];
}

export interface LevelDef {
  id: number;
  act: number;
  name: string;
  subtitle: string;
  grid: string[];
  ammo: number;
  par: number;
  reward: number;
  waves: Spawn[][];
  boss?: { at: [number, number]; hp: number };
  noAmmoDrops?: boolean;
  fireScale: number;
  speedScale: number;
  hint: string;
  bossName?: string;
}

export const ACTS = [
  { id: 1, name: 'ATO I', subtitle: 'Aprender a parar' },
  { id: 2, name: 'ATO II', subtitle: 'O relógio quebrado' },
  { id: 3, name: 'ATO III', subtitle: 'Sem tempo' },
];

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    act: 1,
    name: 'PRIMEIRO\nMOVIMENTO',
    subtitle: 'O tempo só anda quando você anda. Pare e o mundo congela.',
    grid: [
      '#################',
      '#...............#',
      '#....#......o...#',
      '#....#..........#',
      '#....#..........#',
      '#.......###.....#',
      '#..P.....#......#',
      '#........#......#',
      '#...............#',
      '#.........o.....#',
      '#...............#',
      '#............o..#',
      '#################',
    ],
    ammo: 6,
    par: 30,
    reward: 120,
    fireScale: 1,
    speedScale: 1,
    hint: 'Mova-se para o tempo andar. Clique para atirar. Perto do inimigo, F corta.',
    waves: [
      [
        { type: 'gunner', at: [3, 10] },
        { type: 'gunner', at: [7, 14] },
      ],
      [
        { type: 'gunner', at: [2, 13] },
        { type: 'gunner', at: [9, 3] },
      ],
    ],
  },
  {
    id: 2,
    act: 1,
    name: 'LINHA DE\nFOGO',
    subtitle: 'O escudo inimigo só tem um lado. Descubra o outro.',
    grid: [
      '#################',
      '#...............#',
      '#...x.....#..o..#',
      '#.........#.....#',
      '#..###....#.....#',
      '#....#....#..o..#',
      '#.P..#..........#',
      '#....#...###....#',
      '#........#......#',
      '#...x....#......#',
      '#........#...o..#',
      '#...............#',
      '#################',
    ],
    ammo: 8,
    par: 42,
    reward: 150,
    fireScale: 1.06,
    speedScale: 1.03,
    hint: 'Contorne o ESCUDO: tiros na frente são bloqueados.',
    waves: [
      [
        { type: 'gunner', at: [2, 14] },
        { type: 'gunner', at: [10, 4] },
      ],
      [
        { type: 'shield', at: [3, 13] },
        { type: 'gunner', at: [8, 4] },
        { type: 'gunner', at: [6, 13] },
      ],
      [
        { type: 'shield', at: [9, 14] },
        { type: 'burster', at: [11, 5] },
        { type: 'gunner', at: [2, 2] },
      ],
    ],
  },
  {
    id: 3,
    act: 1,
    name: 'DESARMADO',
    subtitle: 'Sem balas. A katana e o aparo são suas armas.',
    grid: [
      '#################',
      '#...............#',
      '#...####...o....#',
      '#...#...........#',
      '#...#....o......#',
      '#...#.......#...#',
      '#.......P...#...#',
      '#....o......#...#',
      '#...........#...#',
      '#...........#...#',
      '#...............#',
      '#...............#',
      '#################',
    ],
    ammo: 0,
    par: 50,
    reward: 200,
    fireScale: 1.05,
    speedScale: 1,
    noAmmoDrops: true,
    hint: 'Sem balas: F corta, botão direito apara. As balas rebatidas matam os donos.',
    waves: [
      [
        { type: 'gunner', at: [1, 1] },
        { type: 'gunner', at: [1, 15] },
      ],
      [
        { type: 'gunner', at: [8, 13] },
        { type: 'gunner', at: [10, 4] },
        { type: 'gunner', at: [2, 10] },
      ],
      [
        { type: 'burster', at: [3, 15] },
        { type: 'burster', at: [9, 2] },
        { type: 'gunner', at: [10, 13] },
      ],
    ],
  },
  {
    id: 4,
    act: 2,
    name: 'SALA DE\nESPERA',
    subtitle: 'A mira laser termina antes de você. Quebre a linha.',
    grid: [
      '#################',
      '#...............#',
      '#..x..#.....#...#',
      '#.....#.....#...#',
      '#.....#..o..#...#',
      '#..P..#.....#...#',
      '#.....#......o..#',
      '#....###...###..#',
      '#...............#',
      '#..o............#',
      '#...............#',
      '#...............#',
      '#################',
    ],
    ammo: 7,
    par: 50,
    reward: 240,
    fireScale: 1,
    speedScale: 1.08,
    hint: 'O laser do PRECISÃO mostra a linha. Use uma parede.',
    waves: [
      [
        { type: 'sniper', at: [2, 14] },
        { type: 'sniper', at: [10, 2] },
      ],
      [
        { type: 'gunner', at: [9, 15] },
        { type: 'sniper', at: [1, 8] },
        { type: 'sniper', at: [11, 13] },
      ],
      [
        { type: 'sniper', at: [9, 14] },
        { type: 'burster', at: [3, 1] },
        { type: 'gunner', at: [8, 8] },
      ],
    ],
  },
  {
    id: 5,
    act: 2,
    name: 'CORREDOR',
    subtitle: 'Eles não atiram. Eles correm. E o tempo corre com eles.',
    grid: [
      '#################',
      '#...............#',
      '#...##...##.....#',
      '#...............#',
      '#.......o.......#',
      '#..##.......##..#',
      '#..##...P...##..#',
      '#..##.......##..#',
      '#...............#',
      '#...##...##.....#',
      '#...............#',
      '#...............#',
      '#################',
    ],
    ammo: 6,
    par: 55,
    reward: 280,
    fireScale: 1.1,
    speedScale: 1,
    hint: 'CAÇADORES carregam. Congele, saia da linha e responda com o corte.',
    waves: [
      [
        { type: 'hunter', at: [1, 1] },
        { type: 'hunter', at: [1, 15] },
        { type: 'gunner', at: [10, 1] },
        { type: 'gunner', at: [10, 15] },
      ],
      [
        { type: 'hunter', at: [2, 8] },
        { type: 'hunter', at: [9, 3] },
        { type: 'hunter', at: [6, 14] },
        { type: 'gunner', at: [11, 8] },
      ],
      [
        { type: 'hunter', at: [3, 15] },
        { type: 'hunter', at: [8, 1] },
        { type: 'burster', at: [1, 8] },
      ],
    ],
  },
  {
    id: 6,
    act: 2,
    name: 'VIDRO\nFUMÊ',
    subtitle: 'Paredes têm janelas. Barris têm pressa.',
    grid: [
      '#################',
      '#...............#',
      '#..x.......x....#',
      '#.....###.......#',
      '#..b..#....o....#',
      '#.....#.........#',
      '#..P..#....b....#',
      '#.....#.........#',
      '#.....###.......#',
      '#..o............#',
      '#......b........#',
      '#............o..#',
      '#################',
    ],
    ammo: 8,
    par: 58,
    reward: 320,
    fireScale: 1.08,
    speedScale: 1.04,
    hint: 'Barris explodem em cadeia. E não perguntam de que lado você está.',
    waves: [
      [
        { type: 'shield', at: [2, 14] },
        { type: 'shield', at: [10, 2] },
        { type: 'gunner', at: [8, 13] },
      ],
      [
        { type: 'burster', at: [1, 8] },
        { type: 'burster', at: [11, 8] },
        { type: 'shield', at: [6, 14] },
      ],
      [
        { type: 'shield', at: [3, 14] },
        { type: 'shield', at: [9, 2] },
        { type: 'burster', at: [11, 4] },
        { type: 'gunner', at: [1, 1] },
      ],
    ],
  },
  {
    id: 7,
    act: 3,
    name: 'CERCO',
    subtitle: 'Todos os tipos. Nenhuma saída fácil. Só o seu próximo passo.',
    grid: [
      '#################',
      '#..x.......x..o.#',
      '#.....###.......#',
      '#..b..#....#....#',
      '#.....#....#..o.#',
      '#..P..#....#....#',
      '#.....###..#....#',
      '#...........#...#',
      '#..x.....b......#',
      '#.....o.........#',
      '#..###....###...#',
      '#...............#',
      '#################',
    ],
    ammo: 6,
    par: 80,
    reward: 380,
    fireScale: 1.16,
    speedScale: 1.08,
    hint: 'Economize balas. Deixe o cerco trabalhar por você.',
    waves: [
      [
        { type: 'gunner', at: [1, 1] },
        { type: 'gunner', at: [1, 15] },
        { type: 'hunter', at: [10, 8] },
      ],
      [
        { type: 'shield', at: [3, 13] },
        { type: 'burster', at: [8, 13] },
        { type: 'gunner', at: [10, 2] },
        { type: 'sniper', at: [1, 8] },
      ],
      [
        { type: 'hunter', at: [2, 3] },
        { type: 'hunter', at: [2, 14] },
        { type: 'shield', at: [9, 14] },
        { type: 'gunner', at: [11, 8] },
      ],
      [
        { type: 'burster', at: [1, 8] },
        { type: 'burster', at: [11, 2] },
        { type: 'shield', at: [8, 14] },
        { type: 'sniper', at: [10, 15] },
        { type: 'hunter', at: [2, 9] },
      ],
    ],
  },
  {
    id: 8,
    act: 3,
    name: 'O\nRELOJOEIRO',
    subtitle: 'Ele fabrica o tempo que você gasta. Não dê a ele mais um segundo.',
    grid: [
      '#################',
      '#...............#',
      '#.....#...#.....#',
      '#.....#...#.....#',
      '#...............#',
      '#..###.....###..#',
      '#...............#',
      '#.....#...#.....#',
      '#.....#...#.....#',
      '#.......o.......#',
      '#.......P.......#',
      '#..o.........o..#',
      '#################',
    ],
    ammo: 8,
    par: 130,
    reward: 600,
    fireScale: 1.15,
    speedScale: 1,
    hint: 'Aparar as balas dele é o caminho mais rápido até o relógio.',
    boss: { at: [5, 8], hp: 14 },
    bossName: 'O Relojoeiro',
    waves: [],
  },
];

export function totalWaves(level: LevelDef): number {
  return level.boss ? 1 : level.waves.length;
}

/**
 * Expands a hand-authored arena with an open field margin.
 * The old border is removed; the interior layout stays, and waves are offset.
 * This is what turns the "small closed board" into a clearing inside a valley.
 */
export function expandLevel(level: LevelDef, margin = 4): LevelDef {
  const oldRows = level.grid.length;
  const oldCols = level.grid[0].length;
  const innerRows = oldRows - 2;
  const innerCols = oldCols - 2;
  const rows = innerRows + margin * 2;
  const cols = innerCols + margin * 2;
  const out: string[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      const border = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      if (border) {
        row.push('#');
      } else {
        const ir = r - margin;
        const ic = c - margin;
        row.push(ir >= 0 && ir < innerRows && ic >= 0 && ic < innerCols ? level.grid[ir + 1][ic + 1] : '.');
      }
    }
    out.push(row);
  }

  const shift = (n: number) => n - 1 + margin;
  const extraCount: Record<number, number> = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2 };
  const extraType: Record<number, EnemyType> = {
    2: 'shield',
    3: 'gunner',
    4: 'burster',
    5: 'hunter',
    6: 'shield',
    7: 'gunner',
  };
  const fieldPoints: [number, number][] = [
    [margin + 2, cols - margin + 1],
    [rows - margin - 3, margin - 3],
    [rows - margin - 5, cols - margin + 1],
    [margin + 3, margin - 3],
    [rows - margin - 4, cols - margin + 2],
  ];
  const waves = level.waves.map((wave, wi) => {
    const shifted = wave.map((spawn) => ({
      ...spawn,
      at: [shift(spawn.at[0]), shift(spawn.at[1])] as [number, number],
    }));
    const extras = extraCount[level.id] ?? 0;
    for (let k = 0; k < extras; k++) {
      const at = fieldPoints[(wi + k) % fieldPoints.length];
      if (out[at[0]]?.[at[1]] !== '.') continue;
      shifted.push({
        type: extraType[level.id],
        at,
      });
    }
    return shifted;
  });
  const boss = level.boss
    ? { hp: level.boss.hp, at: [shift(level.boss.at[0]), shift(level.boss.at[1])] as [number, number] }
    : undefined;
  const spawnCells = new Set(waves.flat().map(({ at }) => at.join(',')));
  let spawnRow = rows - 10;
  let spawnCol = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    const c = out[r].indexOf('P');
    if (c >= 0) { spawnRow = r; spawnCol = c; break; }
  }
  const clearOfSpawn = (r: number, c: number): boolean => {
    const dr = r - spawnRow;
    const dc = c - spawnCol;
    if (Math.hypot(dr, dc) < 5.4) return false;
    // keep the camera's foreground (south of the player) open
    if (dr > 1 && Math.abs(dc) < 7) return false;
    return !spawnCells.has(`${r},${c}`);
  };

  // broad, open-field terrain: low outcrops and cover scattered across the map
  const outcrops: [number, number][] = [
    [3, 4],
    [3, cols - 5],
    [rows - 4, 4],
    [rows - 4, cols - 5],
    [5, Math.floor(cols * 0.3)],
    [5, Math.floor(cols * 0.7)],
    [rows - 6, Math.floor(cols * 0.3)],
    [rows - 6, Math.floor(cols * 0.7)],
    [Math.floor(rows * 0.28), 5],
    [Math.floor(rows * 0.28), cols - 6],
    [Math.floor(rows * 0.72), 5],
    [Math.floor(rows * 0.72), cols - 6],
    [4, Math.floor(cols / 2)],
    [rows - 5, Math.floor(cols / 2)],
    [Math.floor(rows / 2), 4],
    [Math.floor(rows / 2), cols - 5],
    [Math.floor(rows * 0.22), Math.floor(cols * 0.22)],
    [Math.floor(rows * 0.22), Math.floor(cols * 0.78)],
    [Math.floor(rows * 0.78), Math.floor(cols * 0.22)],
    [Math.floor(rows * 0.78), Math.floor(cols * 0.78)],
  ];
  for (const [index, [r, c]] of outcrops.entries()) {
    if ((index + level.id) % 5 > 1) continue;
    if (out[r]?.[c] === '.' && clearOfSpawn(r, c)) out[r][c] = '#';
  }
  const covers: [number, number, string][] = [
    [5, 7, 'x'],
    [rows - 6, cols - 8, 'x'],
    [Math.floor(rows * 0.35), cols - 8, 'b'],
    [Math.floor(rows * 0.65), 7, 'b'],
  ];
  for (const [r, c, ch] of covers) {
    if (out[r]?.[c] === '.' && clearOfSpawn(r, c)) out[r][c] = ch;
  }

  return {
    ...level,
    grid: out.map((row) => row.join('')),
    waves,
    boss,
    ammo: level.ammo > 0 ? level.ammo + 2 : 0,
  };
}
