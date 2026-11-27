import type { DodgeTuning } from './dodge';
import type { RoninTuning } from './ronin';

export type EnemyType =
  | 'gunner'
  | 'burster'
  | 'sniper'
  | 'shield'
  | 'hunter'
  | 'mortar'
  | 'warden'
  | 'statue'
  | 'ninja'
  | 'ronin';

/**
 * Which clock a timer runs on:
 * - 'world' advances only while the player moves (simDt);
 * - 'real' always advances (realDt);
 * - 'inverted' advances only while the player stands still (realDt - simDt).
 */
export type Clock = 'world' | 'real' | 'inverted';

export interface EnemyDef {
  type: EnemyType;
  label: string;
  /** base HP; difficulty adds `enemyHpBonus` unless `fixedHp` is set */
  hp: number;
  fixedHp?: boolean;
  /** clock for the body (spawn grace, turning, movement). Defaults to 'world'. */
  clock?: Clock;
  radius: number;
  fireEvery: number;
  windup: number;
  bulletSpeed: number;
  lead: number;
  burst: number;
  burstGap: number;
  spread: number;
  /**
   * Seek speed. Only the shield and the hunter read it; ranged enemies move
   * with `kite` and the sniper with `reposition`.
   */
  moveSpeed: number;
  strafe: number;
  sightRange: number;
  color: number;
  body: number;
  scale: number;
  // Behaviour tuning. Each block is present only on the types that use it.
  kite?: KiteTuning;
  reposition?: RepositionTuning;
  laser?: LaserTuning;
  bash?: BashTuning;
  lunge?: LungeTuning;
  mortar?: MortarTuning;
  wards?: WardTuning;
  stalk?: StalkTuning;
  strike?: StrikeTuning;
  cloak?: CloakTuning;
  /** midboss: its whole pattern lives in ronin.ts and game.ts `updateRonin` */
  ronin?: RoninTuning;
  /** sidesteps incoming bullets on difficulties that allow it (dodge.ts) */
  dodge?: DodgeTuning;
}

/**
 * Statue: walks on the body clock (inverted), then grabs. The grab windup runs
 * on the same clock, so moving always freezes it.
 */
export interface StalkTuning {
  speed: number;
  triggerRange: number;
  windup: number;
  minWindupMult: number;
  hitRange: number;
  /** after a grab, before it can walk again */
  recovery: number;
  /** stone: bullets push it back instead of hurting it */
  bulletPush: number;
}

/**
 * Ninja: tries to reach the player's back, then strikes in world time. A
 * parry during the strike kills it.
 */
export interface StrikeTuning {
  speed: number;
  /** how far behind the player it aims to stand */
  flankOffset: number;
  triggerRange: number;
  windup: number;
  minWindupMult: number;
  hitRange: number;
  halfArc: number;
  recovery: number;
}

/** Fades out while the world runs and shows itself when time stops. */
export interface CloakTuning {
  /** opacity while time runs at full speed */
  minOpacity: number;
  /** hidden from the radar below this opacity */
  radarAbove: number;
  /** seconds of world time between dust puffs while it moves cloaked */
  trailEvery: number;
}

/** Ranged enemies: strafe while in sight, keep a band of distance, seek when blind. */
export interface KiteTuning {
  /** beyond this distance, also step towards the player */
  approachBeyond: number;
  approachSpeed: number;
  /** inside this distance, also step away from the player */
  retreatWithin: number;
  retreatSpeed: number;
  /** blind seek: fast beyond `seekFar`, slow inside it */
  seekFar: number;
  seekFarSpeed: number;
  seekNearSpeed: number;
}

/** Sniper: holds position while it sees you, walks to regain sight otherwise. */
export interface RepositionTuning {
  speed: number;
  /** stops walking when this close */
  minDistance: number;
}

/** Sniper laser: tracks the player until `lockAt` charge, then commits to one line. */
export interface LaserTuning {
  lockAt: number;
  length: number;
}

/** Shield bash: a short real-time melee swing in front of the shield. */
export interface BashTuning {
  /** stops advancing when this close */
  holdDistance: number;
  /** seek speed multiplier while the player is out of sight */
  blindPaceMult: number;
  triggerRange: number;
  windup: number;
  /** floor for the difficulty windup multiplier */
  minWindupMult: number;
  hitRange: number;
  halfArc: number;
  recovery: number;
}

/** Hunter lunge: real-time windup, then a dash that moves in world time. */
export interface LungeTuning {
  triggerRange: number;
  windup: number;
  minWindupMult: number;
  duration: number;
  speed: number;
  /** multiplied by the difficulty fire multiplier */
  cooldown: number;
  /** body contact always hurts, regardless of difficulty */
  contactRange: number;
}

/** Mortar: a real-time circle dropped where the player is heading. */
export interface MortarTuning {
  radius: number;
  fuse: number;
  minWindupMult: number;
}

/** Warden: a line of plates that arm on contact and detonate in world time. */
export interface WardTuning {
  count: number;
  spacing: number;
  maxDistance: number;
  radius: number;
  fuse: number;
}

/** Shared by every enemy that can dodge: a short hop, then a pause. */
const DODGE: DodgeTuning = { speed: 7, time: 0.16, cooldown: 1.6 };

const KITE: KiteTuning = {
  approachBeyond: 8.5,
  approachSpeed: 0.42,
  retreatWithin: 3.0,
  retreatSpeed: 0.45,
  seekFar: 6,
  seekFarSpeed: 0.55,
  seekNearSpeed: 0.34,
};

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
    kite: KITE,
    dodge: DODGE,
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
    kite: KITE,
    dodge: DODGE,
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
    reposition: { speed: 0.46, minDistance: 0.9 },
    laser: { lockAt: 0.7, length: 30 },
    dodge: DODGE,
  },
  shield: {
    type: 'shield',
    label: 'ESCUDO',
    hp: 2,
    fixedHp: true,
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
    bash: {
      holdDistance: 1.9,
      blindPaceMult: 0.8,
      triggerRange: 2.25,
      windup: 0.7,
      minWindupMult: 0.75,
      hitRange: 2.35,
      halfArc: 1.05,
      recovery: 0.5,
    },
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
    lunge: {
      triggerRange: 4.2,
      windup: 0.65,
      minWindupMult: 0.75,
      duration: 0.3,
      speed: 7.4,
      cooldown: 1.7,
      contactRange: 0.62,
    },
    dodge: DODGE,
  },
  mortar: {
    type: 'mortar',
    label: 'ARTILHEIRO',
    hp: 2,
    radius: 0.42,
    fireEvery: 3.1,
    windup: 0.55,
    bulletSpeed: 0,
    lead: 0.22,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 0.25,
    strafe: 0.18,
    sightRange: 24,
    color: 0xffb347,
    body: 0x665b4c,
    scale: 1.08,
    kite: KITE,
    mortar: { radius: 1.3, fuse: 0.95, minWindupMult: 0.8 },
    dodge: DODGE,
  },
  warden: {
    type: 'warden',
    label: 'MONGE',
    hp: 2,
    radius: 0.36,
    fireEvery: 3.6,
    windup: 0.7,
    bulletSpeed: 0,
    lead: 0,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 0.34,
    strafe: 0.16,
    sightRange: 24,
    color: 0xe8dcc0,
    body: 0x77776d,
    scale: 0.98,
    kite: KITE,
    wards: { count: 3, spacing: 1.8, maxDistance: 8, radius: 1.05, fuse: 0.28 },
    dodge: DODGE,
  },
  statue: {
    type: 'statue',
    label: 'ESTÁTUA',
    hp: 2,
    fixedHp: true,
    clock: 'inverted',
    radius: 0.4,
    fireEvery: 99,
    windup: 0,
    bulletSpeed: 0,
    lead: 0,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 1.25,
    strafe: 0,
    sightRange: 40,
    color: 0x8fe3c4,
    body: 0x8c8a82,
    scale: 1.14,
    stalk: {
      speed: 1.25,
      triggerRange: 1.2,
      windup: 0.45,
      minWindupMult: 0.75,
      hitRange: 1.5,
      recovery: 0.8,
      bulletPush: 0.35,
    },
  },
  ninja: {
    type: 'ninja',
    label: 'SOMBRA',
    hp: 1,
    radius: 0.32,
    fireEvery: 99,
    windup: 0,
    bulletSpeed: 0,
    lead: 0,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 4,
    strafe: 0,
    sightRange: 40,
    color: 0xb48cff,
    body: 0x2b2a3a,
    scale: 0.94,
    strike: {
      speed: 1.9,
      flankOffset: 1.3,
      triggerRange: 1.6,
      windup: 0.5,
      minWindupMult: 0.75,
      hitRange: 1.75,
      halfArc: 0.9,
      recovery: 0.9,
    },
    cloak: { minOpacity: 0.07, radarAbove: 0.5, trailEvery: 0.28 },
    dodge: DODGE,
  },
  ronin: {
    type: 'ronin',
    label: 'RONIN',
    // hits per phase; enemyHpFor reads this, the phase-2 refill comes from `ronin.hpPerPhase`
    hp: 3,
    fixedHp: true,
    radius: 0.62,
    fireEvery: 99,
    windup: 0,
    bulletSpeed: 0,
    lead: 0,
    burst: 0,
    burstGap: 0,
    spread: 0,
    moveSpeed: 0,
    strafe: 0,
    sightRange: 60,
    color: 0xe8c35a,
    body: 0x3a3f4a,
    scale: 1.45,
    ronin: {
      hpPerPhase: 3,
      approachSpeed: [2.1, 2.8],
      stillCreep: 0.8,
      attackCooldown: { easy: [2.2, 1.5], hard: [1.8, 1.1], impossible: [1.1, 0.5] },
      meleeRange: 2.4,
      shurikenRange: 9,
      fleeSpeed: 1.8,
      throwOffset: 1.3,
      // recovery = the vulnerable "stun" after the heavy cut (world time)
      heavy: { windup: [1.0, 0.6], range: 2.9, halfArc: 1.05, recovery: [2.0, 1.4] },
      quickcut: { windup: 0.32, length: 3.4, width: 0.8, recovery: 0.35 },
      shuriken: { windup: [0.42, 0.26], count: [3, 5], spread: 0.32, speed: [10, 12.5] },
      arrows: { count: [3, 4], gap: [0.22, 0.14], speed: 15, lead: 0.06 },
      dash: { distance: 5.2, time: 0.28 },
    },
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
    hint: 'O laser do PRECISÃO mostra a linha. O círculo do ARTILHEIRO não espera o tempo parar.',
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
        { type: 'mortar', at: [5, 2] },
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
    hint: 'Leia as placas do MONGE parado. O ARTILHEIRO continua trabalhando enquanto você pensa.',
    waves: [
      [
        { type: 'gunner', at: [1, 1] },
        { type: 'gunner', at: [1, 15] },
        { type: 'hunter', at: [10, 8] },
      ],
      [
        { type: 'shield', at: [3, 13] },
        { type: 'burster', at: [8, 13] },
        { type: 'mortar', at: [10, 2] },
        { type: 'sniper', at: [1, 8] },
      ],
      [
        { type: 'hunter', at: [2, 3] },
        { type: 'hunter', at: [2, 14] },
        { type: 'shield', at: [9, 14] },
        { type: 'warden', at: [11, 8] },
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
  if (level.id >= 4) {
    const rockCovers: [number, number][] = [
      [Math.floor(rows * 0.42), Math.floor(cols * 0.32)],
      [Math.floor(rows * 0.58), Math.floor(cols * 0.68)],
    ];
    for (const [r, c] of rockCovers) {
      if (out[r]?.[c] === '.' && clearOfSpawn(r, c)) out[r][c] = 'R';
    }
  }

  return {
    ...level,
    grid: out.map((row) => row.join('')),
    waves,
    boss,
    ammo: level.ammo > 0 ? level.ammo + 2 : 0,
  };
}
