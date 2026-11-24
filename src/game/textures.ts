import * as THREE from 'three';
import type { ThemeDef } from './catalog';

function css(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function rgba(hex: number, a: number): string {
  const n = hex;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function makeCtx(size: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c.getContext('2d')!;
}

function toTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tatamiTexture(): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCtx(size);
  const random = rng(17);
  ctx.fillStyle = '#f2ede0';
  ctx.fillRect(0, 0, size, size);

  // horizontal weave
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = random() > 0.5 ? 'rgba(80,67,42,0.07)' : 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, y, size, 2);
  }
  // vertical reeds
  for (let x = 0; x < size; x += 6) {
    for (let y = 0; y < size; y += 8) {
      if (random() > 0.35) {
        ctx.fillStyle = 'rgba(70,56,34,0.05)';
        ctx.fillRect(x, y, 2, 6);
      }
    }
  }
  // fibers
  for (let i = 0; i < 420; i++) {
    const x = random() * size;
    const y = random() * size;
    ctx.strokeStyle = `rgba(70,58,36,${0.02 + random() * 0.045})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 22, y + (random() - 0.5) * 4);
    ctx.stroke();
  }
  // heri (cloth border of the mat)
  ctx.strokeStyle = 'rgba(50,40,26,0.28)';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  ctx.strokeStyle = 'rgba(255,252,240,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(9, 9, size - 18, size - 18);
  return toTexture(ctx.canvas);
}

function wallTexture(): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCtx(size);
  const random = rng(91);
  ctx.fillStyle = '#d9d0be';
  ctx.fillRect(0, 0, size, size);

  // vertical timber planks
  for (let x = 0; x < size; x += 32) {
    const shade = 210 + Math.floor(random() * 22);
    ctx.fillStyle = `rgb(${shade},${shade - 8},${shade - 24})`;
    ctx.fillRect(x + 1, 0, 30, size);
    ctx.fillStyle = 'rgba(48,38,28,0.55)';
    ctx.fillRect(x, 0, 2, size);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = `rgba(70,54,36,${0.06 + random() * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gx = x + 4 + random() * 24;
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 3, 60, gx - 3, 180, gx + 1, size);
      ctx.stroke();
    }
  }
  // horizontal beams
  ctx.fillStyle = 'rgba(56,43,30,0.72)';
  ctx.fillRect(0, 0, size, 12);
  ctx.fillRect(0, 116, size, 14);
  ctx.fillRect(0, size - 12, size, 12);
  ctx.fillStyle = 'rgba(255,246,225,0.22)';
  ctx.fillRect(0, 12, size, 2);
  ctx.fillRect(0, 130, size, 2);
  // iron nails
  for (let x = 14; x < size; x += 32) {
    ctx.fillStyle = 'rgba(30,26,22,0.65)';
    ctx.fillRect(x, 120, 4, 4);
    ctx.fillRect(x, 6, 4, 4);
  }
  const noise = rng(33);
  for (let i = 0; i < 240; i++) {
    ctx.fillStyle = `rgba(40,30,20,${noise() * 0.06})`;
    ctx.fillRect(noise() * size, noise() * size, 1 + noise() * 2, 1 + noise() * 2);
  }
  return toTexture(ctx.canvas);
}

function roofTexture(): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCtx(size);
  const random = rng(53);
  ctx.fillStyle = '#c9c2b4';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 24) {
    const g = ctx.createLinearGradient(0, y, 0, y + 24);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(0.35, 'rgba(90,80,68,0.04)');
    g.addColorStop(0.86, 'rgba(40,32,24,0.3)');
    g.addColorStop(1, 'rgba(25,20,15,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, size, 24);
    ctx.fillStyle = 'rgba(30,25,20,0.28)';
    ctx.fillRect(0, y + 22, size, 2);
    const offset = (y / 24) % 2 === 0 ? 0 : 27;
    for (let x = offset; x < size; x += 54) {
      ctx.fillStyle = 'rgba(40,32,25,0.2)';
      ctx.fillRect(x, y, 1.5, 24);
    }
  }
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = `rgba(220,215,200,${random() * 0.08})`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1);
  }
  return toTexture(ctx.canvas);
}

function woodTexture(): THREE.CanvasTexture {
  const size = 256;
  const ctx = makeCtx(size);
  const random = rng(7);
  ctx.fillStyle = '#d5c8ae';
  ctx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 42) {
    ctx.fillStyle = 'rgba(58,42,25,0.45)';
    ctx.fillRect(x, 0, 2, size);
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(75,54,32,${0.05 + random() * 0.09})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const gx = x + 5 + random() * 30;
      ctx.moveTo(gx, 0);
      ctx.bezierCurveTo(gx + 2, 80, gx - 2, 170, gx, size);
      ctx.stroke();
    }
  }
  // frame
  ctx.strokeStyle = 'rgba(45,32,20,0.7)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, size - 12, size - 12);
  ctx.fillStyle = 'rgba(40,30,20,0.7)';
  for (const [x, y] of [
    [26, 26],
    [size - 26, 26],
    [26, size - 26],
    [size - 26, size - 26],
  ]) {
    ctx.fillRect(x - 2, y - 2, 5, 5);
  }
  return toTexture(ctx.canvas);
}

function paperTexture(theme: ThemeDef): THREE.CanvasTexture {
  const size = 512;
  const ctx = makeCtx(size);
  const random = rng(theme.accent);
  ctx.fillStyle = css(theme.paper);
  ctx.fillRect(0, 0, size, size);

  // washi fibers
  for (let i = 0; i < 900; i++) {
    const x = random() * size;
    const y = random() * size;
    ctx.strokeStyle = `rgba(${theme.wall >> 16 & 255}, ${theme.wall >> 8 & 255}, ${theme.wall & 255}, ${0.015 + random() * 0.035})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 26, y + (random() - 0.5) * 8);
    ctx.stroke();
  }
  // faint table grid
  ctx.strokeStyle = rgba(theme.wall, theme.id === 'theme-washi' ? 0.07 : 0.12);
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  // tea stains / age spots
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rgba(theme.wall, 0.02 + random() * 0.03);
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, 8 + random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(ctx.canvas, 26, 21);
}

function bannerTexture(theme: ThemeDef, variant: number): THREE.CanvasTexture {
  const w = 160;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const random = rng(100 + variant);
  const accent = css(theme.accent);
  const paper = '#f1eee4';

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, h);

  // woven cloth shading
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(0,0,0,${0.015 + random() * 0.02})`;
    ctx.fillRect(0, y, w, 1);
  }

  // border
  ctx.strokeStyle = paper;
  ctx.lineWidth = 7;
  ctx.strokeRect(9, 9, w - 18, h - 18);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(17, 17, w - 34, h - 34);

  ctx.fillStyle = paper;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const glyph = ['侍', '止', '時'][variant % 3];
  ctx.font = '700 108px "Noto Serif JP", "Noto Serif CJK JP", serif';
  ctx.fillText(glyph, w / 2, h * 0.44);

  // small crest below the character
  ctx.strokeStyle = paper;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.78, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2 - 20, h * 0.78);
  ctx.lineTo(w / 2 + 20, h * 0.78);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.78, 4, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export interface ThemeTextures {
  tatami: THREE.CanvasTexture;
  wall: THREE.CanvasTexture;
  roof: THREE.CanvasTexture;
  wood: THREE.CanvasTexture;
  paper: THREE.CanvasTexture;
  banners: THREE.CanvasTexture[];
}

const cache = new Map<string, ThemeTextures>();

export function getTextures(theme: ThemeDef): ThemeTextures {
  const existing = cache.get(theme.id);
  if (existing) return existing;
  const set: ThemeTextures = {
    tatami: tatamiTexture(),
    wall: wallTexture(),
    roof: roofTexture(),
    wood: woodTexture(),
    paper: paperTexture(theme),
    banners: [0, 1, 2].map((v) => bannerTexture(theme, v)),
  };
  cache.set(theme.id, set);
  return set;
}

export function disposeTextures(): void {
  for (const set of cache.values()) {
    set.tatami.dispose();
    set.wall.dispose();
    set.roof.dispose();
    set.wood.dispose();
    set.paper.dispose();
    for (const b of set.banners) b.dispose();
  }
  cache.clear();
}
