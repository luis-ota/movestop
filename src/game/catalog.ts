export type ItemType = 'skin' | 'theme' | 'trail' | 'upgrade';

export interface SkinDef {
  id: string;
  type: 'skin';
  name: string;
  desc: string;
  price: number;
  tag?: string;
  body: number;
  accent: number;
  weapon: number;
  /** CSS colors for shop preview */
  cssBody: string;
  cssAccent: string;
  cssWeapon: string;
  perkName: string;
  perkDesc: string;
  parryMult?: number;
  dashMult?: number;
  extraHp?: number;
  enemyWindupMult?: number;
  coinMult?: number;
}

export interface ThemeDef {
  id: string;
  type: 'theme';
  name: string;
  desc: string;
  price: number;
  tag?: string;
  bg: number;
  paper: number;
  floorA: number;
  floorB: number;
  wall: number;
  wallEdge: number;
  crate: number;
  accent: number;
  sky: number;
  ground: number;
  fog: number;
  css: { bg: string; floor: string; floor2: string; wall: string; accent: string };
}

export interface TrailDef {
  id: string;
  type: 'trail';
  name: string;
  desc: string;
  price: number;
  tag?: string;
  color: number;
  css: string;
  size: number;
}

export interface UpgradeDef {
  id: string;
  type: 'upgrade';
  name: string;
  desc: string;
  price: number;
  tag?: string;
  icon: 'shield' | 'dash' | 'ammo' | 'parry';
}

export type CosmeticDef = SkinDef | ThemeDef | TrailDef | UpgradeDef;

export interface CoinPack {
  id: string;
  type: 'coins';
  name: string;
  desc: string;
  coins: number;
  priceCents: number;
  tag?: string;
  best?: boolean;
  bonus?: string;
  includes?: string[];
}

/** Playable characters. All can be unlocked with earned coins, no paywall. */
export const SKINS: SkinDef[] = [
  {
    id: 'skin-ronin',
    type: 'skin',
    name: 'RONIN',
    desc: 'Sem senhor, sem pressa. O corpo que aprendeu a parar o mundo.',
    price: 0,
    body: 0x17171b,
    accent: 0xd83b2c,
    weapon: 0x2b2b31,
    cssBody: '#17171b',
    cssAccent: '#d83b2c',
    cssWeapon: '#2b2b31',
    perkName: 'CONTRA-GOLPE',
    perkDesc: 'Alcance de aparo +35%.',
    parryMult: 1.35,
  },
  {
    id: 'skin-kitsune',
    type: 'skin',
    name: 'KITSUNE',
    desc: 'Rápido demais para o relógio. A raposa não espera o tempo.',
    price: 420,
    tag: 'ÁGIL',
    body: 0xe7dfcc,
    accent: 0xff6a2a,
    weapon: 0x3a2a20,
    cssBody: '#e7dfcc',
    cssAccent: '#ff6a2a',
    cssWeapon: '#3a2a20',
    perkName: 'PASSADA',
    perkDesc: 'Dash recarrega 40% mais rápido.',
    dashMult: 0.6,
  },
  {
    id: 'skin-oni',
    type: 'skin',
    name: 'ONI',
    desc: 'Um demônio de armadura vermelha. Aguenta um golpe a mais.',
    price: 620,
    tag: 'TANQUE',
    body: 0x5e1511,
    accent: 0xffb02e,
    weapon: 0x260806,
    cssBody: '#5e1511',
    cssAccent: '#ffb02e',
    cssWeapon: '#260806',
    perkName: 'PELE DE FERRO',
    perkDesc: '+1 de vida. Dash 20% mais lento.',
    extraHp: 1,
    dashMult: 1.2,
  },
  {
    id: 'skin-yurei',
    type: 'skin',
    name: 'YUREI',
    desc: 'Um espírito pálido. Os inimigos demoram a acreditar no que veem.',
    price: 720,
    tag: 'SOMBRA',
    body: 0xdde8e4,
    accent: 0x2ee6d0,
    weapon: 0x6b7a78,
    cssBody: '#dde8e4',
    cssAccent: '#2ee6d0',
    cssWeapon: '#6b7a78',
    perkName: 'NÉVOA',
    perkDesc: 'Inimigos levam 25% mais tempo para mirar.',
    enemyWindupMult: 1.25,
  },
  {
    id: 'skin-daimyo',
    type: 'skin',
    name: 'DAIMYO',
    desc: 'Ouro, seda e um exército de credores. Exclusivo do Founder Pack.',
    price: 0,
    tag: 'FOUNDER',
    body: 0xc99918,
    accent: 0x3a1858,
    weapon: 0x7d5c08,
    cssBody: '#c99918',
    cssAccent: '#3a1858',
    cssWeapon: '#7d5c08',
    perkName: 'PATROCÍNIO',
    perkDesc: '+10% de moedas ao fim de cada fase.',
    coinMult: 1.1,
  },
];

export const THEMES: ThemeDef[] = [
  {
    id: 'theme-washi',
    type: 'theme',
    name: 'WASHI',
    desc: 'Papel de arroz, tinta e um sol vermelho. O esboço original.',
    price: 0,
    bg: 0xf1eee4,
    paper: 0xf6f3ea,
    floorA: 0xece7d9,
    floorB: 0xe4ddca,
    wall: 0x1a1a1f,
    wallEdge: 0x41414b,
    crate: 0xcdc5b0,
    accent: 0xd83b2c,
    sky: 0xfffdf6,
    ground: 0xc9c2af,
    fog: 0xf1eee4,
    css: { bg: '#f1eee4', floor: '#ece7d9', floor2: '#e4ddca', wall: '#18181c', accent: '#d83b2c' },
  },
  {
    id: 'theme-noite',
    type: 'theme',
    name: 'NOITE',
    desc: 'Vila adormecida, lanternas acesas. Só você e o relógio.',
    price: 480,
    bg: 0x101018,
    paper: 0x17171f,
    floorA: 0x1b1b25,
    floorB: 0x22222e,
    wall: 0x34343f,
    wallEdge: 0x555568,
    crate: 0x2a2a36,
    accent: 0xff5a3c,
    sky: 0x2b2b45,
    ground: 0x08080c,
    fog: 0x101018,
    css: { bg: '#101018', floor: '#1b1b25', floor2: '#22222e', wall: '#33333f', accent: '#ff5a3c' },
  },
  {
    id: 'theme-neon',
    type: 'theme',
    name: 'NEON',
    desc: 'Edo cyberpunk: chuva, ciano e letreiros de ramen. Anacrônico de propósito.',
    price: 620,
    bg: 0x07090f,
    paper: 0x0d1018,
    floorA: 0x0f1622,
    floorB: 0x121a28,
    wall: 0x1d2537,
    wallEdge: 0x3a4d6d,
    crate: 0x1a2233,
    accent: 0x28f0e0,
    sky: 0x18284a,
    ground: 0x05060a,
    fog: 0x07090f,
    tag: 'NOVO',
    css: { bg: '#07090f', floor: '#0f1622', floor2: '#121a28', wall: '#1c2436', accent: '#28f0e0' },
  },
  {
    id: 'theme-outono',
    type: 'theme',
    name: 'OUTONO',
    desc: 'Folhas vermelhas no chão. O vento também parou.',
    price: 520,
    bg: 0xd8bd9a,
    paper: 0xe4cfb0,
    floorA: 0xd3b894,
    floorB: 0xc5a67f,
    wall: 0x46301f,
    wallEdge: 0x6b4e33,
    crate: 0xa17f52,
    accent: 0xc2381d,
    sky: 0xffe9c9,
    ground: 0xa98a63,
    fog: 0xd8bd9a,
    css: { bg: '#d8bd9a', floor: '#d3b894', floor2: '#c5a67f', wall: '#46301f', accent: '#c2381d' },
  },
  {
    id: 'theme-bambu',
    type: 'theme',
    name: 'BAMBU',
    desc: 'Um bosque verde depois da chuva. Nada se move. Ainda.',
    price: 580,
    bg: 0xb9c7ac,
    paper: 0xcbd6bd,
    floorA: 0xb3c2a4,
    floorB: 0xa5b596,
    wall: 0x2f3d28,
    wallEdge: 0x526743,
    crate: 0x7e8d65,
    accent: 0xd95c2b,
    sky: 0xe6f0dc,
    ground: 0x8d9d7d,
    fog: 0xb9c7ac,
    css: { bg: '#b9c7ac', floor: '#b3c2a4', floor2: '#a5b596', wall: '#2f3d28', accent: '#d95c2b' },
  },
];

export const TRAILS: TrailDef[] = [
  {
    id: 'trail-tinta',
    type: 'trail',
    name: 'TINTA',
    desc: 'O rastro padrão. Um pincel seco cortando o ar.',
    price: 0,
    color: 0x18d8cf,
    css: '#18d8cf',
    size: 1,
  },
  {
    id: 'trail-plasma',
    type: 'trail',
    name: 'PLASMA',
    desc: 'Um filete rosa quente atrás de cada bala.',
    price: 320,
    color: 0xff3d9a,
    css: '#ff3d9a',
    size: 1.25,
    tag: 'POPULAR',
  },
  {
    id: 'trail-sakura',
    type: 'trail',
    name: 'SAKURA',
    desc: 'Pétalas cor-de-rosa no lugar de um rastro. Leve, letal.',
    price: 360,
    color: 0xffb3c7,
    css: '#ffb3c7',
    size: 1.15,
    tag: 'NOVO',
  },
  {
    id: 'trail-ouro',
    type: 'trail',
    name: 'OURO',
    desc: 'Pó de ouro. Combina com decisões caras.',
    price: 460,
    color: 0xf2b51c,
    css: '#f2b51c',
    size: 1.4,
    tag: 'FUN',
  },
];

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'up-kabuto',
    type: 'upgrade',
    name: 'KABUTO',
    desc: '+1 de vida em todas as fases. Errar uma vez não é o fim.',
    price: 900,
    tag: 'META',
    icon: 'shield',
  },
  {
    id: 'up-hayai',
    type: 'upgrade',
    name: 'HAYAI',
    desc: 'Dash recarrega 35% mais rápido. O tempo agradece.',
    price: 640,
    icon: 'dash',
  },
  {
    id: 'up-polvora',
    type: 'upgrade',
    name: 'PÓLVORA',
    desc: '+2 balas no início de cada fase. Munição é opinião.',
    price: 720,
    icon: 'ammo',
  },
  {
    id: 'up-ukaeshi',
    type: 'upgrade',
    name: 'UKAESHI',
    desc: 'Aparo recarrega 40% mais rápido e alcança mais longe.',
    price: 780,
    icon: 'parry',
  },
];

export const PACKS: CoinPack[] = [
  {
    id: 'pack-500',
    type: 'coins',
    name: 'KOBAN',
    desc: 'Dá para uma skin e sobra troco para um revive.',
    coins: 500,
    priceCents: 490,
  },
  {
    id: 'pack-1300',
    type: 'coins',
    name: 'BOLSO',
    desc: 'Um personagem + um tema + espaço para errar.',
    coins: 1300,
    priceCents: 990,
    bonus: '+30%',
    tag: 'MAIS VENDIDO',
    best: true,
  },
  {
    id: 'pack-3200',
    type: 'coins',
    name: 'ARSENAL',
    desc: 'Praticamente o guarda-roupa inteiro.',
    coins: 3200,
    priceCents: 2490,
    bonus: '+60%',
  },
  {
    id: 'pack-founder',
    type: 'coins',
    name: 'FOUNDER PACK',
    desc: '1.500 moedas + personagem DAIMYO + tema NEON + rastro PLASMA.',
    coins: 1500,
    priceCents: 1990,
    tag: 'LIMITADO',
    includes: ['skin-daimyo', 'theme-neon', 'trail-plasma'],
  },
];

export const ALL_ITEMS: CosmeticDef[] = [...SKINS, ...THEMES, ...TRAILS, ...UPGRADES];

export function findItem(id: string): CosmeticDef | undefined {
  return ALL_ITEMS.find((i) => i.id === id);
}

export function findPack(id: string): CoinPack | undefined {
  return PACKS.find((p) => p.id === id);
}

export function findSkin(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
export function findTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
export function findTrail(id: string): TrailDef {
  return TRAILS.find((t) => t.id === id) ?? TRAILS[0];
}

/** Default IDs available without purchase. */
export const DEFAULT_OWNED = ['skin-ronin', 'theme-washi', 'trail-tinta'];
export const DEFAULT_SKIN = 'skin-ronin';
export const DEFAULT_THEME = 'theme-washi';
export const DEFAULT_TRAIL = 'trail-tinta';

export const REVIVE_COST = 100;
export const REVIVE_COST_STEP = 60;
