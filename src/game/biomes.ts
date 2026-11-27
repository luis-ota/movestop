export type BiomeId = 'sakura' | 'bamboo' | 'autumn' | 'snow' | 'burnt' | 'rain' | 'siege' | 'clock';

export type TreeType = 'cherry' | 'maple' | 'bamboo' | 'pine' | 'dead' | 'cedar';

export type WeatherType = 'petals' | 'leaves' | 'snow' | 'rain' | 'embers' | 'fireflies' | 'dust' | 'ash';

export interface BiomeDef {
  id: BiomeId;
  name: string;
  ground: {
    base: number;
    dark: number;
    light: number;
    path: number;
    pathEdge: number;
    stone: number;
    wet: boolean;
  };
  grass: {
    base: number;
    alt: number;
    dry: number;
    density: number;
    height: number;
  };
  tree: {
    type: TreeType;
    leafA: number;
    leafB: number;
    trunk: number;
  };
  flowers: [number, number];
  weather: WeatherType;
  particle: number;
  rocks: number;
  torii: boolean;
  water: boolean;
  banners: boolean;
  lanterns: boolean;
}

const B = (b: BiomeDef): BiomeDef => b;

export const BIOMES: Record<BiomeId, BiomeDef> = {
  sakura: B({
    id: 'sakura',
    name: 'CAMPO DE CEREJEIRAS',
    ground: {
      base: 0x798f60,
      dark: 0x53694b,
      light: 0x95a774,
      path: 0xc8af8a,
      pathEdge: 0x9a8266,
      stone: 0x8d8c7e,
      wet: false,
    },
    grass: { base: 0x93ad6f, alt: 0x667f57, dry: 0xbdab75, density: 1, height: 1.0 },
    tree: { type: 'cherry', leafA: 0xd986a1, leafB: 0xefbbc4, trunk: 0x4d3628 },
    flowers: [0xf2d06b, 0xe9edf2],
    weather: 'petals',
    particle: 0xf3b7c8,
    rocks: 0.16,
    torii: true,
    water: true,
    banners: true,
    lanterns: true,
  }),
  bamboo: B({
    id: 'bamboo',
    name: 'BOSQUE DE BAMBU',
    ground: {
      base: 0x6f8051,
      dark: 0x57683e,
      light: 0x8a9a69,
      path: 0x8d8263,
      pathEdge: 0x746a50,
      stone: 0x7d7a68,
      wet: false,
    },
    grass: { base: 0x7f9c54, alt: 0x617f43, dry: 0xb0aa66, density: 1.15, height: 1.15 },
    tree: { type: 'bamboo', leafA: 0x7fa84e, leafB: 0xa3c46c, trunk: 0x6b8a3e },
    flowers: [0xdce7a7, 0xf0e6c8],
    weather: 'fireflies',
    particle: 0xd7f2a2,
    rocks: 0.12,
    torii: true,
    water: false,
    banners: true,
    lanterns: true,
  }),
  autumn: B({
    id: 'autumn',
    name: 'SANTUÁRIO DE OUTONO',
    ground: {
      base: 0x9a8952,
      dark: 0x7d6c3f,
      light: 0xb3a065,
      path: 0xa28a61,
      pathEdge: 0x866f4d,
      stone: 0x8e8571,
      wet: false,
    },
    grass: { base: 0xa09a58, alt: 0x857b40, dry: 0xceb16a, density: 0.9, height: 1.0 },
    tree: { type: 'maple', leafA: 0xc84b26, leafB: 0xe88b39, trunk: 0x4a2e22 },
    flowers: [0xe1a63a, 0xb23a22],
    weather: 'leaves',
    particle: 0xd9682e,
    rocks: 0.2,
    torii: true,
    water: false,
    banners: true,
    lanterns: true,
  }),
  snow: B({
    id: 'snow',
    name: 'DESFILADEIRO DE NEVE',
    ground: {
      base: 0xdde3df,
      dark: 0xc3cdca,
      light: 0xf1f4ef,
      path: 0xb9c3c2,
      pathEdge: 0x9eaaa9,
      stone: 0x8d9998,
      wet: false,
    },
    grass: { base: 0xb8c3aa, alt: 0x94a189, dry: 0xcfc6a7, density: 0.34, height: 0.8 },
    tree: { type: 'pine', leafA: 0x2f4b3e, leafB: 0x4c6a55, trunk: 0x3f332b },
    flowers: [0xdfe9e4, 0xb8c8c2],
    weather: 'snow',
    particle: 0xf4f7f4,
    rocks: 0.34,
    torii: true,
    water: true,
    banners: false,
    lanterns: true,
  }),
  burnt: B({
    id: 'burnt',
    name: 'VILA QUEIMADA',
    ground: {
      base: 0x655445,
      dark: 0x4f4236,
      light: 0x7d6a55,
      path: 0x6e5b49,
      pathEdge: 0x554536,
      stone: 0x6f675c,
      wet: false,
    },
    grass: { base: 0x7e724a, alt: 0x61552f, dry: 0xa08755, density: 0.55, height: 0.9 },
    tree: { type: 'dead', leafA: 0x59493a, leafB: 0x3a2e27, trunk: 0x2e241d },
    flowers: [0xd77a2f, 0xb18a63],
    weather: 'embers',
    particle: 0xff8a35,
    rocks: 0.3,
    torii: false,
    water: false,
    banners: false,
    lanterns: true,
  }),
  rain: B({
    id: 'rain',
    name: 'JARDIM SOB CHUVA',
    ground: {
      base: 0x68775e,
      dark: 0x50604a,
      light: 0x7f8f6f,
      path: 0x7d7c6d,
      pathEdge: 0x616254,
      stone: 0x7b847c,
      wet: true,
    },
    grass: { base: 0x6f9553, alt: 0x4b6d3d, dry: 0x9b9a60, density: 1.2, height: 1.15 },
    tree: { type: 'bamboo', leafA: 0x5f9149, leafB: 0x8bb765, trunk: 0x526b38 },
    flowers: [0xd7e5cf, 0xb7c7ae],
    weather: 'rain',
    particle: 0xcfdfe2,
    rocks: 0.2,
    torii: true,
    water: true,
    banners: true,
    lanterns: true,
  }),
  siege: B({
    id: 'siege',
    name: 'PÁTIO DO CASTELO',
    ground: {
      base: 0x7f7565,
      dark: 0x655d50,
      light: 0x968a75,
      path: 0x6a6153,
      pathEdge: 0x514b40,
      stone: 0x837d6c,
      wet: false,
    },
    grass: { base: 0x7c7a4c, alt: 0x5d5c37, dry: 0xa79863, density: 0.5, height: 0.8 },
    tree: { type: 'cedar', leafA: 0x384f38, leafB: 0x51694c, trunk: 0x453227 },
    flowers: [0xd6b35d, 0xc9c0a8],
    weather: 'dust',
    particle: 0xcbbd9a,
    rocks: 0.26,
    torii: true,
    water: false,
    banners: true,
    lanterns: true,
  }),
  clock: B({
    id: 'clock',
    name: 'SANTUÁRIO DO RELÓGIO',
    ground: {
      base: 0x574e48,
      dark: 0x433a36,
      light: 0x6d6159,
      path: 0x5b524c,
      pathEdge: 0x413a36,
      stone: 0x6e635c,
      wet: false,
    },
    grass: { base: 0x695f3e, alt: 0x4d452c, dry: 0x8e7a4c, density: 0.45, height: 0.75 },
    tree: { type: 'cherry', leafA: 0x9c3550, leafB: 0xc05a66, trunk: 0x35221f },
    flowers: [0x9e3344, 0xd0b46a],
    weather: 'petals',
    particle: 0xb2475e,
    rocks: 0.3,
    torii: true,
    water: false,
    banners: true,
    lanterns: true,
  }),
};

// one per level, in order; the Ronin's duel (level 7) is fought in the bamboo
const LEVEL_BIOMES: BiomeId[] = ['sakura', 'bamboo', 'autumn', 'snow', 'burnt', 'rain', 'bamboo', 'siege', 'clock'];

export function getBiome(levelId: number): BiomeDef {
  return BIOMES[LEVEL_BIOMES[Math.max(0, Math.min(LEVEL_BIOMES.length - 1, levelId - 1))]];
}
