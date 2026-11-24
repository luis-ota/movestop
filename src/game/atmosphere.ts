import type { BiomeId } from './biomes';

export interface AirPalette {
  top: number;
  mid: number;
  horizon: number;
  sun: number;
  glow: number;
  night: boolean;
  /** crescent moon instead of a full disc */
  crescent: boolean;
  fogNear: number;
  fogFar: number;
  haze: number;
  water: number;
}

export function themeAir(themeId: string): AirPalette {
  switch (themeId) {
    case 'theme-noite':
      return { top: 0x0a1224, mid: 0x1a2a46, horizon: 0x6d5b64, sun: 0xf2ecd8, glow: 0x8d8ab0, night: true, crescent: true, fogNear: 30, fogFar: 250, haze: 0.5, water: 0x3f5a68 };
    case 'theme-neon':
      return { top: 0x06121d, mid: 0x123945, horizon: 0xa34a61, sun: 0xff6f9a, glow: 0x2fffe0, night: true, crescent: true, fogNear: 28, fogFar: 240, haze: 0.45, water: 0x2f6b72 };
    case 'theme-outono':
      return { top: 0xadc2c2, mid: 0xe4d2b4, horizon: 0xf2c79c, sun: 0xffd9a0, glow: 0xf5b26a, night: false, crescent: false, fogNear: 36, fogFar: 270, haze: 0.5, water: 0x7b988f };
    case 'theme-bambu':
      return { top: 0xa5c0ba, mid: 0xcfdacb, horizon: 0xe6e1c8, sun: 0xf3e7b8, glow: 0xc7e0b7, night: false, crescent: false, fogNear: 34, fogFar: 260, haze: 0.5, water: 0x78998c };
    default:
      return { top: 0x7199ae, mid: 0xa9c2c9, horizon: 0xe8ceba, sun: 0xffedc9, glow: 0xffd89a, night: false, crescent: false, fogNear: 40, fogFar: 290, haze: 0.55, water: 0x6f9aa1 };
  }
}

/** Each level has its own weather of light, so the eight biomes never share a sky. */
export function biomeAir(biomeId: BiomeId): AirPalette {
  switch (biomeId) {
    case 'sakura':
      return { top: 0x477f9e, mid: 0x8fb9c7, horizon: 0xf4d9bf, sun: 0xfff1cd, glow: 0xffd6a6, night: false, crescent: false, fogNear: 40, fogFar: 300, haze: 0.5, water: 0x476d74 };
    case 'bamboo':
      return { top: 0x7da79e, mid: 0xbcd0bd, horizon: 0xe9e2c8, sun: 0xf7ecc5, glow: 0xcfe3b8, night: false, crescent: false, fogNear: 34, fogFar: 260, haze: 0.55, water: 0x607f73 };
    case 'autumn':
      return { top: 0x6f93a6, mid: 0xc0ad94, horizon: 0xecb77f, sun: 0xffda9e, glow: 0xf3a45f, night: false, crescent: false, fogNear: 36, fogFar: 270, haze: 0.55, water: 0x7b988f };
    case 'snow':
      return { top: 0x8caec4, mid: 0xc9d9df, horizon: 0xf1f3ee, sun: 0xfff8e8, glow: 0xdbe8ee, night: false, crescent: false, fogNear: 40, fogFar: 310, haze: 0.62, water: 0x8fb0bb };
    case 'burnt':
      return { top: 0x3f3a40, mid: 0x82645a, horizon: 0xce8b61, sun: 0xff9d55, glow: 0xff6a2e, night: false, crescent: false, fogNear: 26, fogFar: 190, haze: 0.72, water: 0x5a6a64 };
    case 'rain':
      return { top: 0x637e87, mid: 0x9cafaf, horizon: 0xc4cfc8, sun: 0xe8eee8, glow: 0xb7d0cd, night: false, crescent: false, fogNear: 30, fogFar: 230, haze: 0.62, water: 0x5a787c };
    case 'siege':
      return { top: 0x7f9aa6, mid: 0xc0bca6, horizon: 0xe6c69b, sun: 0xffe1ae, glow: 0xe8b478, night: false, crescent: false, fogNear: 34, fogFar: 250, haze: 0.58, water: 0x7a9899 };
    case 'clock':
    default:
      return { top: 0x2c3448, mid: 0x685666, horizon: 0xbd7f6d, sun: 0xffc29a, glow: 0xd45a4a, night: true, crescent: false, fogNear: 30, fogFar: 230, haze: 0.62, water: 0x4c6a6b };
  }
}

/** Washi is the neutral theme: the biome owns the light. Paid themes repaint it. */
export function airFor(themeId: string, biomeId: BiomeId): AirPalette {
  return themeId === 'theme-washi' ? biomeAir(biomeId) : themeAir(themeId);
}
