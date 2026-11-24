import * as THREE from 'three';
import { airFor } from './atmosphere';
import type { BiomeId } from './biomes';

/**
 * The far horizon is a painted panorama, like the background of a woodblock
 * print. It gives crisp snow peaks, atmospheric layers and a believable sun
 * without spending geometry on mountains that are hundreds of metres away.
 */
export function buildBackdrop(biome: BiomeId, theme: string, seed: number): { mesh: THREE.Mesh; texture: THREE.CanvasTexture } {
  const air = airFor(theme, biome);
  const W = 2048;
  const H = 768;
  const horizonY = 704;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry(seed + 917);
  const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
  const rgba = (n: number, a: number) => {
    const s = n.toString(16).padStart(6, '0');
    return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`;
  };

  // ---------------- sky ----------------
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, hex(air.top));
  sky.addColorStop(0.34, hex(air.top));
  sky.addColorStop(0.62, hex(air.mid));
  sky.addColorStop(0.88, hex(air.horizon));
  sky.addColorStop(1, hex(air.horizon));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // high clouds, kept very soft
  for (let i = 0; i < 26; i++) {
    const x = rand() * W;
    const y = 70 + rand() * 300;
    const w = 120 + rand() * 340;
    const h = 8 + rand() * 24;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, `rgba(255,251,242,${0.05 + rand() * 0.1})`);
    g.addColorStop(1, 'rgba(255,251,242,0)');
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, h / w);
    ctx.translate(-x, -y);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, w, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // sun / moon
  const sunX = W * 0.62;
  const sunY = horizonY - 274;
  const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 190);
  glow.addColorStop(0, rgba(air.glow, air.night ? 0.14 : 0.28));
  glow.addColorStop(0.4, rgba(air.glow, air.night ? 0.05 : 0.12));
  glow.addColorStop(1, rgba(air.glow, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hex(air.sun);
  ctx.beginPath();
  const disc = air.night ? (air.crescent ? 22 : 34) : 23;
  ctx.arc(sunX, sunY, disc, 0, Math.PI * 2);
  ctx.fill();
  if (air.night) {
    if (air.crescent) {
      ctx.fillStyle = rgba(air.top, 0.55);
      ctx.beginPath();
      ctx.arc(sunX + 8, sunY - 4, disc * 0.85, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(82,36,40,0.25)';
      for (const [cx, cy, cr] of [[-11, -8, 6], [9, 6, 4], [-2, 13, 3], [13, -12, 2.6]] as const) {
        ctx.beginPath();
        ctx.arc(sunX + cx, sunY + cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(246,244,232,${0.12 + rand() * 0.55})`;
      ctx.fillRect(rand() * W, rand() * 380, 1 + rand() * 1.4, 1 + rand() * 1.4);
    }
  }

  // birds, tiny
  if (!air.night) {
    ctx.strokeStyle = 'rgba(28,30,28,0.26)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 8; i++) {
      const bx = 340 + rand() * 1000;
      const by = horizonY - 300 + rand() * 90;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by);
      ctx.quadraticCurveTo(bx - 3, by - 4, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 4, bx + 8, by);
      ctx.stroke();
    }
  }

  // ---------------- mountains ----------------
  const rock = new THREE.Color(rockTone(biome, air.night));
  const snow = new THREE.Color(snowTone(biome, air.night));
  const layers = [
    { base: horizonY + 4, height: 84, peaks: 9, colorMix: 0.16, snowLine: 0.7, snow: air.night ? 0.08 : 0.24, dominant: 0 },
    { base: horizonY + 1, height: 152, peaks: 8, colorMix: 0.32, snowLine: 0.52, snow: air.night ? 0.14 : 0.62, dominant: 0.34 },
    { base: horizonY - 2, height: 238, peaks: 7, colorMix: 0.48, snowLine: 0.4, snow: air.night ? 0.2 : 0.86, dominant: 0.56 },
  ];
  if (biome === 'burnt' || biome === 'clock') {
    for (const layer of layers) layer.snow = biome === 'clock' ? 0.08 : 0;
  }

  // distant lake, painted as a thin silver band under the mountains
  if (biome === 'sakura' || biome === 'bamboo' || biome === 'snow' || biome === 'rain') {
    const lakeGrad = ctx.createLinearGradient(0, horizonY - 22, 0, horizonY + 2);
    lakeGrad.addColorStop(0, rgba(air.water, 0.35));
    lakeGrad.addColorStop(0.55, rgba(air.water, 0.8));
    lakeGrad.addColorStop(1, rgba(air.horizon, 0.7));
    ctx.fillStyle = lakeGrad;
    ctx.fillRect(0, horizonY - 22, W, 24);
    ctx.fillStyle = 'rgba(249,245,236,0.16)';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect(rand() * W, horizonY - 18 + rand() * 16, 20 + rand() * 80, 1);
    }
  }

  for (const layer of layers) {
    const peaks = peakSet(rand, layer.peaks, layer.dominant);
    const points: [number, number][] = [];
    const step = 6;
    for (let x = 0; x <= W + step; x += step) {
      const u = x / W;
      let h = 0.1;
      for (const peak of peaks) {
        const d = Math.abs(u - peak.at);
        if (d < peak.width) h += peak.height * (1 - d / peak.width);
      }
      h += 0.012 * Math.sin(u * 79 + layer.height) + 0.008 * Math.sin(u * 161 + 2.1);
      const y = layer.base - layer.height * Math.min(0.95, h);
      points.push([x, y]);
    }
    ctx.beginPath();
    ctx.moveTo(0, layer.base);
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.lineTo(W, layer.base);
    ctx.closePath();
    const color = rock.clone().offsetHSL(0, 0, 0.02 + layer.colorMix * 0.12);
    color.lerp(new THREE.Color(air.mid), layer.colorMix * 0.55);
    color.lerp(new THREE.Color(air.horizon), layer.colorMix * 0.22);
    const baseColor = color.clone().offsetHSL(0, -0.02, -0.04);
    const peakColor = color.clone().offsetHSL(0, 0, 0.08);
    const grad = ctx.createLinearGradient(0, layer.base, 0, layer.base - layer.height);
    grad.addColorStop(0, hex(baseColor.getHex()));
    grad.addColorStop(0.55, hex(color.getHex()));
    grad.addColorStop(1, hex(peakColor.getHex()));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.save();
    ctx.strokeStyle = rgba(baseColor.clone().offsetHSL(0, 0, -0.1).getHex(), 0.6);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // shaded slopes: a few translucent facets on the right side of peaks
    ctx.save();
    ctx.clip();
    for (const peak of peaks) {
      if (peak.height < 0.22) continue;
      const px = peak.at * W;
      const peakY = layer.base - layer.height * (0.1 + peak.height);
      ctx.fillStyle = 'rgba(26,34,40,0.08)';
      ctx.beginPath();
      ctx.moveTo(px, peakY);
      ctx.lineTo(px + peak.width * W * 0.72, layer.base);
      ctx.lineTo(px + peak.width * W * 0.18, layer.base);
      ctx.closePath();
      ctx.fill();
    }
    // snow caps: a wavy lower edge, then gullies and rock striations
    if (layer.snow > 0) {
      const snowLineAt = (x: number) => layer.base - layer.height * (layer.snowLine + 0.035 * Math.sin(x * 0.018 + layer.height) + 0.012 * Math.sin(x * 0.051));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      for (let x = W; x >= 0; x -= 8) ctx.lineTo(x, snowLineAt(x));
      ctx.closePath();
      const snowGrad = ctx.createLinearGradient(0, layer.base - layer.height, 0, layer.base - layer.height * layer.snowLine + 20);
      snowGrad.addColorStop(0, hex(snow.clone().offsetHSL(0, 0, 0.04).getHex()));
      snowGrad.addColorStop(0.72, hex(snow.getHex()));
      snowGrad.addColorStop(1, rgba(snow.getHex(), 0.65));
      ctx.fillStyle = snowGrad;
      ctx.fill();
      // blue gullies and exposed rock veins
      ctx.strokeStyle = rgba(rock.clone().offsetHSL(0, 0, -0.04).getHex(), 0.28);
      ctx.lineWidth = 2;
      for (const peak of peaks) {
        if (peak.height < layer.height / 1000 || peak.height < 0.14) continue;
        const px = peak.at * W;
        const peakY = layer.base - layer.height * (0.1 + peak.height);
        ctx.beginPath();
        ctx.moveTo(px + (rand() - 0.5) * 12, peakY + 2);
        ctx.lineTo(px + peak.width * W * 0.22, snowLineAt(px) + 16);
        ctx.stroke();
      }
    }
    // a few dark rock veins below the snowline
    ctx.strokeStyle = 'rgba(24,31,36,0.12)';
    ctx.lineWidth = 3;
    for (const peak of peaks) {
      if (peak.height < 0.16) continue;
      const px = peak.at * W;
      const peakY = layer.base - layer.height * (0.1 + peak.height);
      ctx.beginPath();
      ctx.moveTo(px, peakY + 12);
      ctx.lineTo(px - peak.width * W * 0.3, layer.base - 6);
      ctx.stroke();
    }
    ctx.restore();

    // atmospheric haze at the foot of each range
    const haze = ctx.createLinearGradient(0, layer.base - 38, 0, layer.base + 8);
    haze.addColorStop(0, rgba(air.horizon, 0));
    haze.addColorStop(0.62, rgba(air.horizon, 0.34));
    haze.addColorStop(1, rgba(air.horizon, 0.6));
    ctx.fillStyle = haze;
    ctx.fillRect(0, layer.base - 38, W, 46);
  }

  // ---------------- forest line ----------------
  const forestBase = horizonY + 2;
  const forestDark = new THREE.Color(forestTone(biome)).lerp(new THREE.Color(air.horizon), 0.18);
  ctx.fillStyle = hex(forestDark.getHex());
  ctx.beginPath();
  ctx.moveTo(0, forestBase);
  for (let x = 0; x <= W; x += 9) {
    const h = 3 + rand() * 13 + Math.sin(x * 0.013) * 3;
    ctx.lineTo(x, forestBase - h);
  }
  ctx.lineTo(W, forestBase);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // a few individual crowns so the line does not read as a sawblade
  ctx.fillStyle = hex(forestDark.clone().offsetHSL(0, 0.02, -0.03).getHex());
  for (let i = 0; i < 60; i++) {
    const x = rand() * W;
    const h = 6 + rand() * 15;
    ctx.beginPath();
    ctx.ellipse(x, forestBase - h, 5 + rand() * 7, h * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // a soft veil in front of the base, so the 3D meadow merges into the painting
  const veil = ctx.createLinearGradient(0, forestBase - 52, 0, forestBase + 10);
  veil.addColorStop(0, rgba(air.horizon, 0));
  veil.addColorStop(1, rgba(air.horizon, 0.5));
  ctx.fillStyle = veil;
  ctx.fillRect(0, forestBase - 52, W, 64);

  // ground below the horizon, hidden by the 3D meadow
  ctx.fillStyle = hex(new THREE.Color(forestDark).offsetHSL(0, 0, -0.06).getHex());
  ctx.fillRect(0, forestBase + 2, W, H - forestBase);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1300, 505),
    new THREE.MeshBasicMaterial({ map: texture, fog: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  mesh.position.set(0, 210, -520);
  mesh.renderOrder = -20;
  return { mesh, texture };
}

function peakSet(rand: () => number, count: number, dominant: number): { at: number; height: number; width: number }[] {
  const peaks: { at: number; height: number; width: number }[] = [];
  for (let i = 0; i < count; i++) {
    const at = (i + 0.2 + rand() * 0.6) / count;
    peaks.push({ at, height: 0.1 + rand() * 0.28, width: 0.028 + rand() * 0.06 });
  }
  if (dominant > 0) {
    const at = 0.5 + (rand() - 0.5) * 0.1;
    peaks.push({ at, height: dominant, width: 0.052 });
    peaks.push({ at: at - 0.055, height: dominant * 0.62, width: 0.038 });
    peaks.push({ at: at + 0.07, height: dominant * 0.55, width: 0.042 });
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

function rockTone(biome: BiomeId, night: boolean): number {
  switch (biome) {
    case 'snow': return night ? 0x4a5d70 : 0x455d70;
    case 'burnt': return 0x4b3d3a;
    case 'clock': return 0x403648;
    case 'rain': return 0x42565b;
    case 'siege': return 0x575347;
    case 'autumn': return 0x50473f;
    case 'bamboo': return 0x3f5649;
    default: return night ? 0x33454f : 0x3a5661;
  }
}

function snowTone(biome: BiomeId, night: boolean): number {
  if (night) return biome === 'clock' ? 0xc8b0ab : 0xb9c4d0;
  return biome === 'burnt' ? 0x8c8077 : 0xf1f3ec;
}

function forestTone(biome: BiomeId): number {
  switch (biome) {
    case 'snow': return 0x3f5148;
    case 'burnt': return 0x332c28;
    case 'clock': return 0x3b2b35;
    case 'rain': return 0x3d5544;
    case 'siege': return 0x4f523e;
    case 'autumn': return 0x5a4030;
    case 'bamboo': return 0x3d5540;
    default: return 0x4d423f;
  }
}
