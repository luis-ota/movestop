import * as THREE from 'three';
import { airFor } from './atmosphere';
import type { BiomeId } from './biomes';

/**
 * Distant ranges are painted as layered curtains: a smooth silhouette, a
 * vertical altitude ramp, rock shade and snow caps. They are deliberately
 * flat (like a woodblock print) because true geometry at this distance only
 * produces noisy, paper-thin cones.
 */
export function buildRidges(biome: BiomeId, theme: string, halfH: number, seed: number): THREE.Group {
  const group = new THREE.Group();
  const air = airFor(theme, biome);
  const horizon = new THREE.Color(air.horizon);
  const sky = new THREE.Color(air.mid);
  const rock = new THREE.Color(rockTone(biome));
  const snow = new THREE.Color(snowTone(biome, air.night));
  const snowBiome = biome === 'snow';
  const burnt = biome === 'burnt' || biome === 'clock';

  const layers = [
    { distance: 50, height: 4.2, width: 330, haze: 0.0, snow: 0, phase: 2.1, ground: true },
    { distance: 95, height: 17, width: 500, haze: 0.02, snow: burnt ? 0 : 0.06, phase: 1.2, ground: false },
    { distance: 172, height: 46, width: 820, haze: 0.05, snow: burnt ? 0 : 0.3, phase: 4.3, ground: false },
    { distance: 288, height: 96, width: 1320, haze: 0.09, snow: burnt ? 0 : 0.55, phase: 2.3, ground: false },
    { distance: 430, height: 168, width: 1980, haze: 0.14, snow: burnt ? 0 : 0.7, phase: 0.9, ground: false },
  ];

  layers.forEach(({ distance, height, width, haze, snow: snowAmount, phase, ground: isGround }, layer) => {
    const steps = 200;
    const rows = 12;
    const peaks = peakSet(seed + layer * 17);
    const profile = (u: number): number => {
      if (isGround) {
        return height * (0.55 + 0.2 * Math.sin(u * 7.1 + phase) + 0.08 * Math.sin(u * 15.3 + phase * 1.7));
      }
      const shoulder = 0.16 + 0.05 * Math.sin(u * 5.2 + phase) + 0.02 * Math.sin(u * 11.7 + phase * 1.6);
      let ridge = 0;
      for (const peak of peaks) {
        ridge += peak.height * Math.exp(-Math.pow((u - peak.at) * peak.width, 2));
      }
      const texture = 0.008 * Math.sin(u * 43 + phase) + 0.005 * Math.sin(u * 79 + phase * 2);
      return height * Math.min(0.96, shoulder + ridge + texture);
    };
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();
    const heightAt = (u: number): number => profile(u);

    const shadeAt = (u: number): number => {
      const d = 0.004;
      const slope = (heightAt(Math.min(1, u + d)) - heightAt(Math.max(0, u - d))) / (2 * d);
      return THREE.MathUtils.clamp(-slope * 0.35, -0.02, 0.02);
    };

    for (let i = 0; i < steps; i++) {
      const u = i / steps;
      const u2 = (i + 1) / steps;
      const h = heightAt(u);
      const h2 = heightAt(u2);
      const x = (u - 0.5) * width;
      const x2 = (u2 - 0.5) * width;
      const z = -halfH - distance + Math.sin(u * 3.7 + phase) * distance * 0.035;
      const z2 = -halfH - distance + Math.sin(u2 * 3.7 + phase) * distance * 0.035;
      const shade = shadeAt(u);
      for (let r = 0; r < rows; r++) {
        const t = r / rows;
        const t2 = (r + 1) / rows;
        const yA = -4 + (h + 4) * t;
        const yA2 = -4 + (h + 4) * t2;
        const yB = -4 + (h2 + 4) * t;
        const yB2 = -4 + (h2 + 4) * t2;
        const quad = [
          [x, yA, z],
          [x2, yB, z2],
          [x2, yB2, z2],
          [x, yA2, z],
        ];
        const alt = (t + t2) / 2;
        const snowline = snowBiome ? 0.4 : 0.58 + 0.03 * Math.sin(u * 5.7 + phase);
        const frost = snowAmount * THREE.MathUtils.smoothstep(alt, snowline, snowline + 0.1);
        if (isGround) {
          color.setHex(groundTone(biome));
        } else {
          color.copy(rock).offsetHSL(layer * 0.008, -0.02 + layer * 0.004, shade + layer * 0.018);
        }
        color.lerp(snow, Math.min(0.94, frost));
        const atmosphere = haze + (1 - alt) * 0.025;
        color.lerp(horizon, Math.min(0.2, atmosphere));
        for (const tri of [
          [quad[0], quad[1], quad[2]],
          [quad[0], quad[2], quad[3]],
        ]) {
          for (const p of tri) {
            positions.push(...p);
            colors.push(color.r, color.g, color.b);
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, side: THREE.DoubleSide }),
    );
    mesh.renderOrder = -8 + layer;
    group.add(mesh);
  });
  return group;
}

function peakSet(seed: number): { at: number; height: number; width: number }[] {
  const rand = mulberry(seed);
  const peaks: { at: number; height: number; width: number }[] = [];
  const count = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < count; i++) {
    peaks.push({
      at: 0.16 + rand() * 0.68,
      height: 0.3 + rand() * 0.42,
      width: 3.2 + rand() * 7.2,
    });
  }
  return peaks;
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rockTone(biome: BiomeId): number {
  switch (biome) {
    case 'snow': return 0x4e6478;
    case 'burnt': return 0x4a3c39;
    case 'clock': return 0x403746;
    case 'rain': return 0x44585d;
    case 'siege': return 0x575448;
    case 'autumn': return 0x514941;
    case 'bamboo': return 0x40574a;
    default: return 0x2f4652;
  }
}

function snowTone(biome: BiomeId, night: boolean): number {
  if (night) return biome === 'clock' ? 0xc8b0ab : 0xbac5d2;
  return biome === 'burnt' ? 0x8d8178 : 0xf7f8f1;
}

function groundTone(biome: BiomeId): number {
  switch (biome) {
    case 'snow': return 0xdbe4e1;
    case 'burnt': return 0x59483e;
    case 'clock': return 0x4a3f3b;
    case 'rain': return 0x4f6157;
    case 'siege': return 0x6f6855;
    case 'autumn': return 0x857741;
    case 'bamboo': return 0x526846;
    default: return 0x667b55;
  }
}
