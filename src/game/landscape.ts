import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { BiomeDef } from './biomes';
import type { ThemeDef } from './catalog';
import { getTextures } from './textures';
import { airFor } from './atmosphere';
import { buildBackdrop } from './backdrop';

interface Inst {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rx: number;
  ry: number;
  rz: number;
  c: number;
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

function colorNear(base: number, amount: number, rand: () => number): number {
  const c = new THREE.Color(base);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    hsl.h + (rand() - 0.5) * amount * 0.03,
    Math.max(0, Math.min(1, hsl.s + (rand() - 0.5) * amount * 0.12)),
    Math.max(0.02, Math.min(1, hsl.l + (rand() - 0.5) * amount * 0.1)),
  );
  return c.getHex();
}

function addInst(
  out: Inst[],
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  c: number,
  ry = 0,
  rx = 0,
  rz = 0,
): void {
  out.push({ x, y, z, sx, sy, sz, rx, ry, rz, c });
}

function buildInstanced(
  insts: Inst[],
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  castShadow: boolean,
  receiveShadow: boolean,
): THREE.InstancedMesh | null {
  if (insts.length === 0) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, insts.length);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  insts.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.rotation.set(inst.rx, inst.ry, inst.rz);
    dummy.scale.set(inst.sx, inst.sy, inst.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    color.setHex(inst.c);
    mesh.setColorAt(i, color);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  mesh.frustumCulled = false;
  return mesh;
}

let grassTexture: THREE.CanvasTexture | null = null;
let grassGeometry: THREE.BufferGeometry | null = null;

function getGrassAssets(): { tex: THREE.CanvasTexture; geo: THREE.BufferGeometry } {
  if (!grassTexture) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 128);
    const rand = rng(777);
    for (let i = 0; i < 9; i++) {
      const x = 10 + rand() * 108;
      const h = 40 + rand() * 78;
      const w = 3 + rand() * 3.8;
      const bend = (rand() - 0.5) * 28;
      const grad = ctx.createLinearGradient(0, 128, 0, 128 - h);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.72, 'rgba(255,255,255,0.82)');
      grad.addColorStop(1, 'rgba(255,255,255,0.5)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x - w, 128);
      ctx.quadraticCurveTo(x - w * 0.3 + bend * 0.3, 128 - h * 0.55, x + bend, 128 - h);
      ctx.quadraticCurveTo(x + w * 0.4 + bend * 0.4, 128 - h * 0.5, x + w, 128);
      ctx.closePath();
      ctx.fill();
    }
    // seed heads
    for (let i = 0; i < 4; i++) {
      const x = 16 + rand() * 96;
      const y = 22 + rand() * 42;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y, 2.5 + rand() * 2, 6 + rand() * 5, (rand() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    grassTexture = new THREE.CanvasTexture(c);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.anisotropy = 4;
    grassTexture.needsUpdate = true;
  }
  if (!grassGeometry) {
    const g1 = new THREE.PlaneGeometry(1, 1);
    g1.translate(0, 0.5, 0);
    const g2 = new THREE.PlaneGeometry(1, 1);
    g2.rotateY(Math.PI / 2);
    g2.translate(0, 0.5, 0);
    grassGeometry = mergeGeometries([g1, g2])!;
  }
  return { tex: grassTexture, geo: grassGeometry };
}

function trailX(z: number, halfH: number, biome: BiomeDef): number {
  const d = Math.max(0, (z + halfH + 1.25) / Math.max(12, halfH * 2 + 1.25));
  const turn = biome.id === 'bamboo' || biome.id === 'snow' || biome.id === 'siege' ? -1 : 1;
  return turn * (-5.8 * Math.sin(d * Math.PI * 1.55) + 4.1 * d);
}

function drawGroundTexture(biome: BiomeDef, seed: number, width: number, depth: number, halfH: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 768;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const rand = rng(seed);
  const g = biome.ground;
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

  ctx.fillStyle = hex(g.base);
  ctx.fillRect(0, 0, w, h);

  // large soft patches
  for (let i = 0; i < 34; i++) {
    ctx.save();
    ctx.beginPath();
    const x = rand() * w;
    const y = rand() * h;
    ctx.ellipse(x, y, 40 + rand() * 190, 25 + rand() * 130, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = hex(rand() > 0.5 ? g.dark : g.light);
    ctx.globalAlpha = 0.06 + rand() * 0.08;
    ctx.fill();
    ctx.restore();
  }

  // path / clearing
  const clearX = w * 0.5;
  const clearY = h * 0.5;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(clearX, clearY, w * (0.3 + i * 0.035), h * (0.3 + i * 0.03), 0.1, 0, Math.PI * 2);
    ctx.fillStyle = hex(g.path);
    ctx.globalAlpha = 0.055;
    ctx.fill();
  }
  ctx.restore();

  // Paint the trail in world coordinates so grass clears the same route.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(w / width, h / depth);
  const edge = (z: number) => 1.08 + Math.sin(z * 0.51) * 0.15 + Math.cos(z * 1.9) * 0.075;
  for (const [extra, opacity, color] of [[0.42, 0.34, g.pathEdge], [0.12, 0.5, g.path], [-0.08, 0.42, g.path]] as const) {
    ctx.beginPath();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= 110; i++) {
        const z = depth * ((side ? 110 - i : i) / 110 - 0.5);
        const x = trailX(z, halfH, biome) + (edge(z) + extra) * (side ? 1 : -1);
        if (!side && !i) ctx.moveTo(x, z); else ctx.lineTo(x, z);
      }
    }
    ctx.globalAlpha = opacity;
    ctx.fillStyle = hex(color);
    ctx.fill();
  }
  // worn wheel ruts and pebbles along the trail
  for (const offset of [-0.34, 0.34]) {
    ctx.beginPath();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= 110; i++) {
        const z = depth * ((side ? 110 - i : i) / 110 - 0.5);
        const x = trailX(z, halfH, biome) + offset;
        if (!side && !i) ctx.moveTo(x, z); else ctx.lineTo(x, z);
      }
    }
    ctx.strokeStyle = hex(g.pathEdge);
    ctx.globalAlpha = 0.22;
    ctx.lineWidth = 0.09;
    ctx.stroke();
  }
  for (let i = 0; i < 160; i++) {
    const z = (rand() - 0.5) * depth;
    const x = trailX(z, halfH, biome) + (rand() - 0.5) * 1.55;
    ctx.fillStyle = rand() > 0.5 ? hex(g.stone) : hex(g.pathEdge);
    ctx.globalAlpha = 0.18 + rand() * 0.22;
    ctx.beginPath();
    ctx.arc(x, z, 0.035 + rand() * 0.09, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // biome-specific patterns
  if (biome.id === 'siege') {
    ctx.save();
    ctx.translate(clearX, clearY);
    for (let row = -3; row <= 3; row++) {
      for (let col = -5; col <= 5; col++) {
        if (rand() < 0.18) continue;
        const sw = 52 + rand() * 16;
        const sh = 34 + rand() * 10;
        const px = col * 88 + (row % 2) * 22 + (rand() - 0.5) * 8;
        const py = row * 66 + (rand() - 0.5) * 6;
        ctx.fillStyle = hex(rand() > 0.6 ? g.stone : g.light);
        ctx.globalAlpha = 0.24 + rand() * 0.1;
        ctx.fillRect(px, py, sw, sh);
        ctx.strokeStyle = 'rgba(35,30,24,0.15)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px, py, sw, sh);
      }
    }
    ctx.restore();
  }

  if (biome.id === 'rain') {
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 100, 12 + rand() * 34, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(110,140,144,0.22)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,220,220,0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  if (biome.id === 'snow') {
    for (let i = 0; i < 30; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(rand() * w, rand() * h, 30 + rand() * 120, 16 + rand() * 60, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.restore();
    }
    // footsteps
    ctx.strokeStyle = 'rgba(120,140,145,0.18)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      ctx.arc(w * 0.2 + i * 26, h * 0.82 - i * 17 + Math.sin(i) * 8, 3.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (biome.id === 'clock') {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,16,15,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(clearX, clearY, w * 0.17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(clearX, clearY, w * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(clearX + Math.cos(a) * w * 0.09, clearY + Math.sin(a) * w * 0.09);
      ctx.lineTo(clearX + Math.cos(a) * w * 0.16, clearY + Math.sin(a) * w * 0.16);
      ctx.stroke();
    }
    ctx.restore();
  }

  // stones
  for (let i = 0; i < 120; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 1 + rand() * 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hex(rand() > 0.5 ? g.stone : g.dark);
    ctx.globalAlpha = 0.12 + rand() * 0.2;
    ctx.fill();
  }

  // leaf litter / petals
  if (biome.id === 'autumn' || biome.id === 'sakura' || biome.id === 'clock') {
    const petal = biome.id === 'autumn' ? 0xd0692f : biome.id === 'clock' ? 0x8f3347 : 0xf0b6c5;
    for (let i = 0; i < 320; i++) {
      ctx.save();
      ctx.translate(rand() * w, rand() * h);
      ctx.rotate(rand() * Math.PI);
      ctx.fillStyle = hex(petal);
      ctx.globalAlpha = 0.18 + rand() * 0.4;
      ctx.fillRect(-2.5, -1, 5, 2);
      ctx.restore();
    }
  }

  // fine noise / blades
  for (let i = 0; i < 4200; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.strokeStyle = rand() > 0.5 ? hex(g.light) : hex(g.dark);
    ctx.globalAlpha = 0.05 + rand() * 0.1;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 4, y - 2 - rand() * 6);
    ctx.stroke();
  }

  // ashen vfx
  if (biome.id === 'burnt') {
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(20,17,15,0.35)' : 'rgba(255,130,50,0.35)';
      const x = rand() * w;
      const y = rand() * h;
      ctx.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
    }
  }

  // vignette on the ground edges
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, biome.id === 'snow' ? 'rgba(150,170,180,0.2)' : 'rgba(20,25,15,0.35)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

class WeatherParticles {
  readonly mesh: THREE.InstancedMesh;
  private data: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    spin: number;
    angle: number;
    phase: number;
    scale: number;
  }[] = [];
  private dummy = new THREE.Object3D();
  private mode: BiomeDef['weather'];
  private bounds = { x: 17, z: 14 };
  private time = 0;
  private baseCount: number;
  private maxCount: number;

  constructor(biome: BiomeDef, halfW = 14, halfH = 11) {
    this.mode = biome.weather;
    this.bounds = { x: halfW + 3, z: halfH + 3 };
    const scale = Math.min(2.3, Math.max(1, (halfW * halfH) / 154));
    const baseCount =
      this.mode === 'snow'
        ? Math.round(120 * scale)
        : this.mode === 'rain'
          ? Math.round(150 * scale)
          : this.mode === 'fireflies'
            ? Math.round(38 * scale)
            : this.mode === 'petals' || this.mode === 'leaves'
              ? Math.round(90 * scale)
              : Math.round(70 * scale);
    const slowWeatherBoost = this.mode === 'petals' || this.mode === 'leaves' || this.mode === 'dust' || this.mode === 'ash';
    this.baseCount = baseCount;
    this.maxCount = slowWeatherBoost ? Math.round(baseCount * 1.8) : baseCount;
    let geo: THREE.BufferGeometry;
    if (this.mode === 'rain') geo = new THREE.BoxGeometry(0.012, 0.3, 0.012);
    else if (this.mode === 'snow') geo = new THREE.BoxGeometry(0.048, 0.048, 0.048);
    else if (this.mode === 'embers') geo = new THREE.BoxGeometry(0.045, 0.045, 0.045);
    else geo = new THREE.BoxGeometry(0.065, 0.012, 0.105);

    const glow = this.mode === 'fireflies' || this.mode === 'embers';
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: this.mode === 'rain',
      opacity: this.mode === 'rain' ? 0.32 : 1,
      depthWrite: this.mode !== 'rain',
      blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.maxCount);
    this.mesh.count = this.baseCount;
    this.mesh.frustumCulled = false;
    const color = new THREE.Color();
    for (let i = 0; i < this.maxCount; i++) {
      const x = (Math.random() - 0.5) * this.bounds.x * 2;
      const z = (Math.random() - 0.5) * this.bounds.z * 2;
      const y =
        this.mode === 'fireflies'
          ? 0.5 + Math.random() * 2.4
          : this.mode === 'embers'
            ? 0.4 + Math.random() * 3.5
            : Math.random() * 6.5 + 0.4;
      const drift = this.mode === 'rain' ? 0.7 : this.mode === 'snow' ? 0.22 : 0.34;
      this.data.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * drift,
        vy:
          this.mode === 'rain'
            ? -11 - Math.random() * 6
            : this.mode === 'embers'
              ? 0.25 + Math.random() * 0.4
              : this.mode === 'fireflies'
                ? (Math.random() - 0.5) * 0.12
                : -0.14 - Math.random() * 0.3,
        vz: (Math.random() - 0.5) * drift,
        spin: (Math.random() - 0.5) * (this.mode === 'rain' ? 0.1 : 2.4),
        angle: Math.random() * Math.PI * 2,
        phase: Math.random() * Math.PI * 2,
        scale: this.mode === 'rain' ? 0.45 + Math.random() * 1.0 : 0.6 + Math.random() * 1.5,
      });
      color.setHex(biome.particle);
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.writeMatrices();
  }

  private writeMatrices(): void {
    this.data.forEach((p, i) => {
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.angle, p.phase, this.mode === 'rain' ? 0.1 : p.angle * 0.5);
      this.dummy.scale.setScalar(p.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setTimeScale(timeScale: number): void {
    const slow = Number.isFinite(timeScale) && timeScale < 0.45;
    const boosted = slow && (this.mode === 'petals' || this.mode === 'leaves' || this.mode === 'dust' || this.mode === 'ash');
    this.mesh.count = boosted ? this.maxCount : this.baseCount;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    this.time += dt;
    for (let i = 0; i < this.data.length; i++) {
      const p = this.data[i];
      p.x += (p.vx + Math.sin(this.time * 0.7 + p.phase) * 0.12) * dt;
      p.z += (p.vz + Math.cos(this.time * 0.5 + p.phase) * 0.08) * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (this.mode === 'embers') {
        if (p.y > 6.5) {
          p.y = 0.2;
          p.x = (Math.random() - 0.5) * this.bounds.x * 1.6;
          p.z = (Math.random() - 0.5) * this.bounds.z * 1.6;
        }
      } else if (this.mode === 'fireflies') {
        if (p.x > this.bounds.x) p.x = -this.bounds.x;
        if (p.x < -this.bounds.x) p.x = this.bounds.x;
        if (p.z > this.bounds.z) p.z = -this.bounds.z;
        if (p.z < -this.bounds.z) p.z = this.bounds.z;
      } else if (p.y < 0.05) {
        p.y = 6 + Math.random() * 2;
        p.x = (Math.random() - 0.5) * this.bounds.x * 2;
        p.z = (Math.random() - 0.5) * this.bounds.z * 2;
      }
      if (p.x > this.bounds.x + 2) p.x = -this.bounds.x - 2;
      if (p.x < -this.bounds.x - 2) p.x = this.bounds.x + 2;
      if (p.z > this.bounds.z + 2) p.z = -this.bounds.z - 2;
      if (p.z < -this.bounds.z - 2) p.z = this.bounds.z + 2;
    }
    this.writeMatrices();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export interface Landscape {
  group: THREE.Group;
  lights: THREE.PointLight[];
  update: (dt: number, timeScale?: number) => void;
  dispose: () => void;
}

export interface LandscapeOptions {
  grid: string[];
  halfW: number;
  halfH: number;
  biome: BiomeDef;
  theme: ThemeDef;
  seed: number;
  menu?: boolean;
}

export function buildLandscape(opts: LandscapeOptions): Landscape {
  const { grid, halfW, halfH, biome, theme, seed, menu = false } = opts;
  const group = new THREE.Group();
  const air = airFor(theme.id, biome.id);
  const backdropTextures: THREE.Texture[] = [];
  const lights: THREE.PointLight[] = [];
  const rand = rng(seed);
  const cols = grid[0].length;
  const rows = grid.length;
  const tex = getTextures(theme);

  const trunk: Inst[] = [];
  const canopy: Inst[] = [];
  const rock: Inst[] = [];
  const grass: Inst[] = [];
  const flower: Inst[] = [];
  const fallen: Inst[] = [];

  // ---------------- ground ----------------
  const groundW = cols + 30;
  const groundH = rows + 20;
  const groundTex = drawGroundTexture(biome, seed, groundW, groundH, halfH);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
  });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(groundW, groundH), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  group.add(ground);

  const farMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(biome.ground.base).offsetHSL(0, -0.05, 0.02), roughness: 1 });
  const far = new THREE.Mesh(new THREE.PlaneGeometry(1000, 900), farMat);
  far.rotation.x = -Math.PI / 2;
  far.position.y = -0.12;
  far.receiveShadow = false;
  group.add(far);

  // ---------------- painted horizon ----------------
  const backdrop = buildBackdrop(biome.id, theme.id, seed);
  backdropTextures.push(backdrop.texture);
  group.add(backdrop.mesh);

  // ---------------- helpers ----------------
  const wallCells: { r: number; c: number; x: number; z: number; border: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '#') {
        wallCells.push({
          r,
          c,
          x: c - halfW,
          z: r - halfH,
          border: r === 0 || c === 0 || r === rows - 1 || c === cols - 1,
        });
      }
    }
  }

  const addBush = (x: number, z: number, scale: number, colA: number, colB: number): void => {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const s = (0.45 + rand() * 0.55) * scale;
      addInst(
        canopy,
        x + (rand() - 0.5) * 0.9 * scale,
        0.25 + rand() * 0.25 * scale,
        z + (rand() - 0.5) * 0.9 * scale,
        s,
        s * (0.6 + rand() * 0.4),
        s,
        colorNear(rand() > 0.5 ? colA : colB, 0.7, rand),
        rand() * Math.PI,
      );
    }
  };

  const addRocks = (x: number, z: number, scale: number, count = 3): void => {
    for (let i = 0; i < count; i++) {
      const s = (0.46 + rand() * 0.5) * scale;
      const tall = i === 0 ? 1.45 + rand() * 0.45 : 0.72 + rand() * 0.45;
      addInst(
        rock,
        x + (rand() - 0.5) * 0.95,
        (s * tall) / 2 - 0.02,
        z + (rand() - 0.5) * 0.95,
        s * (1.05 + rand() * 0.55),
        s * tall,
        s * (0.85 + rand() * 0.35),
        new THREE.Color(colorNear(rand() > 0.45 ? biome.ground.stone : biome.ground.dark, 0.32, rand)).offsetHSL(0, -0.02, 0.06).getHex(),
        rand() * Math.PI,
        (rand() - 0.5) * 0.22,
        (rand() - 0.5) * 0.22,
      );
      if (i === 0) {
        addInst(rock, x + (rand() - 0.5) * 1.15, s * 0.24, z + (rand() - 0.5) * 1.15, s * 0.7, s * 0.48, s * 0.6, colorNear(biome.ground.stone, 0.35, rand), rand() * Math.PI);
        if (rand() < 0.7) {
          addInst(canopy, x + (rand() - 0.5) * 0.35, s * tall + 0.01, z + (rand() - 0.5) * 0.35, s * 0.38, s * 0.08, s * 0.32, colorNear(biome.tree.leafB, 0.6, rand), rand() * Math.PI);
        }
      }
    }
    if (biome.id !== 'snow' && rand() < 0.55) {
      addBush(x + 0.2, z - 0.15, 0.42, biome.tree.leafA, biome.tree.leafB);
    }
  };

  const addTree = (x: number, z: number, scale: number, hero = false): void => {
    const type = biome.tree.type;
    const trunkColor = biome.tree.trunk;
    const leafA = biome.tree.leafA;
    const leafB = biome.tree.leafB;
    const h =
      (type === 'bamboo' ? 3.0 : type === 'pine' || type === 'cedar' ? 2.8 : 2.25) * scale +
      rand() * 0.35 * scale;

    if (type === 'bamboo') {
      const stalks = 4 + Math.floor(rand() * 3);
      for (let i = 0; i < stalks; i++) {
        const ox = (rand() - 0.5) * 0.85 * scale;
        const oz = (rand() - 0.5) * 0.85 * scale;
        const sh = (2.1 + rand() * 1.8) * scale;
        const lean = (rand() - 0.5) * 0.12;
        addInst(
          trunk,
          x + ox,
          sh / 2,
          z + oz,
          0.075 * scale,
          sh,
          0.075 * scale,
          colorNear(biome.tree.trunk, 0.3, rand),
          rand() * Math.PI,
          lean,
          (rand() - 0.5) * 0.12,
        );
        // culm nodes
        for (let n = 1; n <= 3; n++) {
          addInst(
            trunk,
            x + ox + lean * sh * 0.03 * n,
            (sh * n) / 3.4,
            z + oz,
            0.085 * scale,
            0.035 * scale,
            0.085 * scale,
            colorNear(0x6f7c3e, 0.4, rand),
            rand() * Math.PI,
          );
        }
        const leaves = 6 + Math.floor(rand() * 4);
        for (let j = 0; j < leaves; j++) {
          const s = (0.12 + rand() * 0.16) * scale;
          addInst(
            canopy,
            x + ox + (rand() - 0.5) * 0.6,
            sh * (0.58 + rand() * 0.4),
            z + oz + (rand() - 0.5) * 0.6,
            s * 1.7,
            s * 0.28,
            s * 1.1,
            colorNear(rand() > 0.5 ? leafA : leafB, 0.45, rand),
            rand() * Math.PI,
            (rand() - 0.5) * 0.5,
            (rand() - 0.5) * 0.5,
          );
        }
      }
      addBush(x + 0.2, z + 0.2, 0.55, leafA, leafB);
      return;
    }

    if (type === 'dead') {
      addInst(trunk, x, h * 0.45, z, 0.2 * scale, h * 0.9, 0.2 * scale, trunkColor, rand() * Math.PI, 0, (rand() - 0.5) * 0.1);
      for (let i = 0; i < 4; i++) {
        const a = rand() * Math.PI * 2;
        const len = (0.7 + rand() * 0.9) * scale;
        addInst(
          trunk,
          x + Math.sin(a) * len * 0.4,
          h * (0.5 + rand() * 0.3),
          z + Math.cos(a) * len * 0.4,
          0.075 * scale,
          len,
          0.075 * scale,
          colorNear(trunkColor, 0.3, rand),
          a,
          Math.PI / 3.2,
          0,
        );
      }
      return;
    }

    addInst(trunk, x, h * 0.45, z, 0.22 * scale, h * 0.9, 0.22 * scale, trunkColor, rand() * Math.PI, 0, (rand() - 0.5) * 0.06);

    if (type === 'pine' || type === 'cedar') {
      const tiers = 5;
      for (let i = 0; i < tiers; i++) {
        const t = i / tiers;
        const s = (1.2 - t * 0.82) * scale;
        addInst(
          canopy,
          x,
          h * (0.42 + t * 0.5),
          z,
          s * 1.25,
          s * 0.32,
          s * 1.25,
          colorNear(i % 2 === 0 ? leafA : leafB, 0.35, rand),
          rand() * Math.PI,
        );
        if (biome.id === 'snow' && i > 1) {
          addInst(canopy, x, h * (0.46 + t * 0.5), z, s * 1.1, s * 0.16, s * 1.1, 0xe9f0ec, rand() * Math.PI);
        }
      }
      // small twigs at the top
      for (let i = 0; i < 4; i++) {
        const s = (0.16 + rand() * 0.16) * scale;
        addInst(canopy, x + (rand() - 0.5) * 0.5, h * (0.9 + rand() * 0.1), z + (rand() - 0.5) * 0.5, s, s * 0.7, s, colorNear(leafB, 0.4, rand));
      }
    } else {
      // cherry / maple: dense crown made of small voxels, never huge slabs
      const clusters = hero ? 26 : 15;
      for (let i = 0; i < clusters; i++) {
        const a = (i / clusters) * Math.PI * 2 + rand() * 0.8;
        const radius = (hero ? 1.45 : 0.9) * scale * (0.22 + rand() * 0.78);
        const s = (0.2 + rand() * 0.27) * scale * (hero ? 1.15 : 1);
        addInst(
          canopy,
          x + Math.cos(a) * radius,
          h * 0.78 + rand() * 0.95 * scale,
          z + Math.sin(a) * radius,
          s,
          s * (0.7 + rand() * 0.35),
          s,
          colorNear(rand() > 0.5 ? leafA : leafB, 0.5, rand),
          rand() * Math.PI,
          (rand() - 0.5) * 0.3,
          (rand() - 0.5) * 0.3,
        );
      }
      // a few green leaves among the blossoms for a softer silhouette
      if (biome.id === 'sakura') {
        for (let i = 0; i < 4; i++) {
          const s = (0.16 + rand() * 0.2) * scale;
          addInst(
            canopy,
            x + (rand() - 0.5) * 1.2 * scale,
            h * 0.82 + rand() * 0.65 * scale,
            z + (rand() - 0.5) * 1.2 * scale,
            s,
            s * 0.7,
            s,
            colorNear(0x8ca35c, 0.4, rand),
            rand() * Math.PI,
          );
        }
      }
      for (let i = 0; i < 2; i++) {
        const a = rand() * Math.PI * 2;
        addInst(
          trunk,
          x + Math.sin(a) * 0.45 * scale,
          h * 0.64,
          z + Math.cos(a) * 0.45 * scale,
          0.09 * scale,
          0.9 * scale,
          0.09 * scale,
          trunkColor,
          a,
          Math.PI / 3.5,
          0,
        );
      }
    }
    if (!hero) addBush(x + 0.3, z + 0.2, 0.62, leafA, leafB);
  };



  const addHeroTree = (x: number, z: number, scale: number): void => {
    addTree(x, z, scale, true);
    for (let i = 0; i < 16; i++) {
      addInst(
        fallen,
        x + (rand() - 0.5) * 5,
        0.012 + rand() * 0.02,
        z + (rand() - 0.5) * 5,
        0.16 + rand() * 0.2,
        0.01,
        0.09 + rand() * 0.12,
        biome.id === 'autumn' ? colorNear(0xc85a26, 0.5, rand) : biome.id === 'clock' ? 0x8d3448 : 0xf0b3c2,
        rand() * Math.PI,
      );
    }
  };

  // ---------------- wall cells become scenery ----------------
  const treeChance = menu ? 0 : biome.tree.type === 'bamboo' ? 0.16 : 0.075;
  for (const cell of wallCells) {
    const roll = rand();
    if (cell.border) {
      // the field is open: only occasional low stones mark the far edge
      if (!menu && rand() < 0.28) {
        addRocks(cell.x + (rand() - 0.5) * 0.5, cell.z + (rand() - 0.5) * 0.5, 0.35 + rand() * 0.25, 1);
      }
      continue;
    }
    if (roll < treeChance) {
      addTree(cell.x + (rand() - 0.5) * 0.2, cell.z + (rand() - 0.5) * 0.2, 0.5 + rand() * 0.3);
    } else {
      // low rock outcrops keep sightlines open in the clearing
      addRocks(cell.x, cell.z, 0.74 + rand() * 0.36, 2 + Math.floor(rand() * 2));
      if (rand() < 0.13) {
        addBush(cell.x + (rand() - 0.5) * 0.5, cell.z + (rand() - 0.5) * 0.5, 0.5 + rand() * 0.3, biome.tree.leafA, biome.tree.leafB);
      }
    }
  }

  // ---------------- outer forest ring ----------------
  const ringCount = menu ? 0 : 38;
  for (let i = 0; i < ringCount; i++) {
    const side = Math.floor(rand() * 3);
    let x = 0;
    let z = 0;
    const spread = 4.2 + rand() * 8.5;
    if (side === 0) {
      x = -halfW - spread;
      z = (rand() - 0.5) * (halfH * 2 + 8);
    } else if (side === 1) {
      x = halfW + spread;
      z = (rand() - 0.5) * (halfH * 2 + 8);
    } else if (side === 2) {
      z = -halfH - spread;
      x = (rand() - 0.5) * (halfW * 2 + 10);
    } else {
      z = halfH + spread;
      x = (rand() - 0.5) * (halfW * 2 + 10);
    }
    addTree(x, z, 1.0 + rand() * 0.85);
  }

  // hero cherry trees / biome trees
  if (menu) {
    addHeroTree(halfW + 2.9, -halfH + 0.8, 1.95);
    addHeroTree(halfW + 5.5, -halfH - 3.5, 1.36);
    addHeroTree(-halfW - 4.2, -halfH - 1, 1.52);
  } else {
    addHeroTree(-halfW - 4.4, -halfH - 0.6, biome.id === 'snow' ? 0.9 : 1.05);
    addHeroTree(halfW + 5.2, -halfH + 2.2, biome.id === 'snow' ? 0.85 : 1.0);
    if (biome.id === 'sakura' || biome.id === 'autumn' || biome.id === 'clock') {
      addHeroTree(halfW + 4.2, -halfH - 4.4, 1.15);
    }
  }

  // ---------------- grass / flowers ----------------
  const insideCount = Math.round(Math.min(900, cols * rows * 1.45) * biome.grass.density);
  const outsideCount = Math.round(Math.min(760, cols * rows * 1.9) * biome.grass.density);
  const riverCenter = (x: number) => -halfH - 4.2 + Math.sin(x * 0.09 + 0.2) * 2.8 + Math.sin(x * 0.22 + 1.2) * 0.5;
  const riverWidth = (x: number) => 2.7 + Math.sin(x * 0.13 + 0.8) * 0.45;
  const clearVegetation = (x: number, z: number) => Math.abs(x - trailX(z, halfH, biome)) < 1.02 ||
    (biome.water && Math.abs(z - riverCenter(x)) < riverWidth(x) / 2 + 0.45);
  const grassColor = (): number => {
    const roll = rand();
    if (roll < 0.2) return colorNear(biome.grass.dry, 0.65, rand);
    const c = new THREE.Color(colorNear(roll < 0.58 ? biome.grass.base : biome.grass.alt, 0.55, rand));
    c.offsetHSL(0, -0.02, 0.11);
    return c.getHex();
  };
  for (let i = 0; i < insideCount; i++) {
    const x = (rand() - 0.5) * (halfW * 2 - 1.4);
    const z = (rand() - 0.5) * (halfH * 2 - 1.4);
    if (clearVegetation(x, z) || Math.sin(x * 0.7 + z * 0.44) + Math.cos(z * 0.64 - x * 0.5) < -0.35) continue;
    const scale = (0.2 + rand() * 0.28) * biome.grass.height;
    addInst(grass, x, 0.005, z, 0.75 + rand() * 0.45, scale, 0.75 + rand() * 0.45, grassColor(), rand() * Math.PI);
  }
  for (let i = 0; i < outsideCount; i++) {
    const x = (rand() - 0.5) * (halfW * 2 + 16);
    const z = (rand() - 0.5) * (halfH * 2 + 14);
    if ((Math.abs(x) < halfW + 0.5 && Math.abs(z) < halfH + 0.5) || clearVegetation(x, z)) continue;
    const scale = (0.36 + rand() * 0.38) * biome.grass.height;
    addInst(grass, x, 0.005, z, 0.9 + rand() * 0.6, scale, 0.9 + rand() * 0.6, grassColor(), rand() * Math.PI);
  }

  const flowerCount = biome.id === 'snow' ? 16 : 130;
  for (let i = 0; i < flowerCount; i++) {
    const x = (rand() - 0.5) * (halfW * 2 + 8);
    const z = (rand() - 0.5) * (halfH * 2 + 6);
    if (clearVegetation(x, z)) continue;
    const c = rand() > 0.5 ? biome.flowers[0] : biome.flowers[1];
    addInst(flower, x, 0.1, z, 0.05 + rand() * 0.05, 0.1 + rand() * 0.12, 0.05 + rand() * 0.05, colorNear(c, 0.5, rand), rand() * Math.PI);
  }

  // wildflower clusters, so the meadow reads as a place, not a lawn
  for (let c = 0; c < 7; c++) {
    const cx = (rand() - 0.5) * (halfW * 1.7);
    const cz = (rand() - 0.5) * (halfH * 1.5);
    if (clearVegetation(cx, cz)) continue;
    for (let i = 0; i < 12; i++) {
      const x = cx + (rand() - 0.5) * 2.2;
      const z = cz + (rand() - 0.5) * 1.6;
      if (clearVegetation(x, z)) continue;
      const col = rand() > 0.55 ? biome.flowers[0] : biome.flowers[1];
      addInst(flower, x, 0.12 + rand() * 0.06, z, 0.06 + rand() * 0.04, 0.09 + rand() * 0.08, 0.06 + rand() * 0.04, colorNear(col, 0.5, rand), rand() * Math.PI);
    }
  }

  // ---------------- trail dressing ----------------
  for (let z = -halfH + 1.4; z < halfH - 1; z += 1.45) {
    const x = trailX(z, halfH, biome);
    for (const side of [-1, 1]) {
      if (rand() < 0.7) {
        addInst(rock, x + side * (1.05 + rand() * 0.35), 0.1, z + (rand() - 0.5) * 0.5, 0.16 + rand() * 0.16, 0.1 + rand() * 0.12, 0.18 + rand() * 0.16, colorNear(biome.ground.stone, 0.35, rand), rand() * Math.PI);
      }
    }
  }

  // ---------------- reeds near water / borders ----------------
  const reedCount = biome.water ? 26 : 12;
  for (let i = 0; i < reedCount; i++) {
    const side = rand() > 0.5 ? -1 : 1;
    const x = side * (halfW + 1.3 + rand() * 3.4);
    const z = (rand() - 0.5) * (halfH * 2 + 3);
    const n = 3 + Math.floor(rand() * 4);
    for (let j = 0; j < n; j++) {
      const sh = 1.2 + rand() * 1.4;
      addInst(trunk, x + (rand() - 0.5) * 0.9, sh / 2, z + (rand() - 0.5) * 0.9, 0.03, sh, 0.03, colorNear(0x9a8b5d, 0.5, rand), rand() * Math.PI, 0, (rand() - 0.5) * 0.18);
      addInst(canopy, x + (rand() - 0.5) * 0.9, sh + 0.1, z + (rand() - 0.5) * 0.9, 0.1, 0.28, 0.1, colorNear(0xb5a578, 0.4, rand), rand() * Math.PI);
    }
  }

  // ---------------- river + bridge ----------------
  let waterTex: THREE.CanvasTexture | null = null;
  if (biome.water && !menu) {
    const wc = document.createElement('canvas');
    wc.width = 256;
    wc.height = 128;
    const wctx = wc.getContext('2d')!;
    const wr = rng(seed + 17);
    const wbase = new THREE.Color(air.water);
    const wl = wbase.clone().offsetHSL(0, -0.04, 0.1);
    const wd = wbase.clone().offsetHSL(0, -0.02, -0.06);
    const wx = (c: THREE.Color) => '#' + c.getHexString();
    const depths = wctx.createLinearGradient(0, 0, 0, 128);
    depths.addColorStop(0, wx(wl));
    depths.addColorStop(0.28, wx(wbase));
    depths.addColorStop(0.64, wx(wd));
    depths.addColorStop(1, wx(wl));
    wctx.fillStyle = depths;
    wctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 90; i++) {
      wctx.strokeStyle = `rgba(245,250,246,${0.025 + wr() * 0.075})`;
      wctx.lineWidth = 0.6 + wr() * 1.2;
      const y = wr() * 128;
      wctx.beginPath();
      wctx.moveTo(wr() * 256, y);
      wctx.lineTo(wr() * 256, y + (wr() - 0.5) * 2.2);
      wctx.stroke();
    }
    waterTex = new THREE.CanvasTexture(wc);
    waterTex.wrapS = THREE.RepeatWrapping;
    waterTex.wrapT = THREE.RepeatWrapping;
    waterTex.colorSpace = THREE.SRGBColorSpace;
    const waterMat = new THREE.MeshBasicMaterial({
      map: waterTex,
      color: 0xffffff,
      fog: true,
    });

    const segs = 120;
    const x0 = -halfW - 26;
    const x1 = halfW + 26;
    const ribbon = (extra: number, y: number, color: number, material?: THREE.Material) => {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = x0 + (x1 - x0) * t;
        const zc = riverCenter(x);
        const half = riverWidth(x) / 2 + extra;
        positions.push(x, y, zc - half, x, y, zc + half);
        uvs.push(t * 8, 0, t * 8, 1);
        if (i < segs) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material ?? new THREE.MeshStandardMaterial({ color, roughness: 1 }));
      mesh.receiveShadow = true;
      group.add(mesh);
    };
    ribbon(2.7, 0.006, biome.ground.dark);
    ribbon(0.75, 0.014, biome.ground.pathEdge);
    const waterGeo = new THREE.BufferGeometry();
    {
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = x0 + (x1 - x0) * t;
        const zc = riverCenter(x);
        const half = riverWidth(x) / 2;
        positions.push(x, 0.048, zc - half, x, 0.048, zc + half);
        uvs.push(t * 8, 0, t * 8, 1);
        if (i < segs) {
          const a = i * 2;
          indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      waterGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      waterGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      waterGeo.setIndex(indices);
      waterGeo.computeVertexNormals();
    }
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.receiveShadow = true;
    group.add(water);

    // thin foam edges and half-submerged stones break the ribbon silhouette
    for (const side of [-1, 1]) {
      const foamPos: number[] = [];
      const foamIdx: number[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const x = x0 + (x1 - x0) * t;
        const zc = riverCenter(x);
        const z = zc + side * (riverWidth(x) / 2 - 0.06);
        foamPos.push(x, 0.052, z, x, 0.052, z + side * 0.12);
        if (i < segs) {
          const a = i * 2;
          foamIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      const foamGeo = new THREE.BufferGeometry();
      foamGeo.setAttribute('position', new THREE.Float32BufferAttribute(foamPos, 3));
      foamGeo.setIndex(foamIdx);
      const foam = new THREE.Mesh(foamGeo, new THREE.MeshBasicMaterial({ color: 0xe9f0e9, transparent: true, opacity: 0.22, depthWrite: false }));
      group.add(foam);
    }
    for (let i = 0; i < 16; i++) {
      const t = rand();
      const x = x0 + (x1 - x0) * t;
      const zc = riverCenter(x);
      const side = rand() > 0.5 ? 1 : -1;
      addInst(rock, x, 0.13, zc + side * (0.2 + rand() * (riverWidth(x) / 2 - 0.4)), 0.35 + rand() * 0.45, 0.25 + rand() * 0.3, 0.3 + rand() * 0.4, colorNear(biome.ground.stone, 0.35, rand), rand() * Math.PI);
    }

    // reeds, pebbles and cattails along both banks
    for (let i = 0; i < 34; i++) {
      const t = rand();
      const x = x0 + (x1 - x0) * t;
      const zc = riverCenter(x);
      const side = rand() > 0.5 ? 1 : -1;
      const zBank = zc + side * (riverWidth(x) / 2 + 0.75 + rand() * 1.5);
      const reeds = 4 + Math.floor(rand() * 6);
      for (let j = 0; j < reeds; j++) {
        const sh = 1.0 + rand() * 1.9;
        const rx = x + (rand() - 0.5) * 1.3;
        const rz = zBank + (rand() - 0.5) * 0.8;
        addInst(trunk, rx, sh / 2, rz, 0.022, sh, 0.022, colorNear(0x9c8b5f, 0.5, rand), rand() * Math.PI, 0, (rand() - 0.5) * 0.22);
        addInst(canopy, rx, sh + 0.07, rz, 0.08, 0.3 + rand() * 0.16, 0.08, colorNear(0xb2a06d, 0.4, rand), rand() * Math.PI);
        if (rand() < 0.35) {
          addInst(canopy, rx, sh + 0.28, rz, 0.07, 0.16, 0.07, 0x6b4b33, rand() * Math.PI);
        }
      }
      if (rand() < 0.65) {
        addInst(rock, x + (rand() - 0.5) * 2.2, 0.22, zc + side * (riverWidth(x) / 2 + 0.35), 0.42 + rand() * 0.55, 0.3 + rand() * 0.4, 0.42 + rand() * 0.5, colorNear(biome.ground.stone, 0.45, rand), rand() * Math.PI);
      }
    }

    // bridge, with stone footings and a pair of lanterns
    const bridge = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5e4638, roughness: 0.9 });
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x725746, roughness: 0.94 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: biome.ground.stone, roughness: 0.96 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 5.8), woodMat);
    deck.position.y = 0.22;
    for (let i = 0; i < 11; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.055, 0.44), plankMat);
      plank.position.set(0, 0.32, -2.65 + i * 0.53);
      bridge.add(plank);
    }
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 5.8), woodMat);
      rail.position.set(side * 1.62, 1.06, 0);
      const rail2 = rail.clone();
      rail2.position.y = 0.7;
      bridge.add(rail, rail2);
      for (let i = 0; i < 4; i++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.18, 0.12), woodMat);
        post.position.set(side * 1.62, 0.59, -2.6 + i * 1.73);
        bridge.add(post);
      }
    }
    for (const side of [-1, 1]) {
      const footing = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.5, 1.1), stoneMat);
      footing.position.set(0, 0.14, side * 2.65);
      bridge.add(footing);
    }
    bridge.add(deck);
    bridge.position.set(0, 0, riverCenter(0));
    bridge.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    group.add(bridge);

    // small stone lanterns at the bridge approach
    for (const side of [-1, 1]) {
      const lx = side * 2.9;
      const lz = riverCenter(0) + 3.4;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), stoneMat);
      base.position.set(lx, 0.09, lz);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), stoneMat);
      stem.position.set(lx, 0.43, lz);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.56), stoneMat);
      cap.position.set(lx, 0.9, lz);
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.24, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xffc06a, emissive: 0xffa536, emissiveIntensity: 0.8, roughness: 0.4 }),
      );
      glow.position.set(lx, 0.71, lz);
      group.add(base, stem, cap, glow);
      base.castShadow = stem.castShadow = cap.castShadow = true;
    }
  }

  // ---------------- far-bank grove ----------------
  {
    const count = menu ? 8 : 14;
    for (let i = 0; i < count; i++) {
      const x = -halfW + 1.5 + (i / Math.max(1, count - 1)) * (halfW * 2 - 3) + (rand() - 0.5) * 2.6;
      const z = -halfH - (menu ? 6.2 : 7.4) - rand() * 2.4;
      if (Math.abs(x) < 2.2) continue;
      addTree(x, z, 0.72 + rand() * 0.45);
    }
  }

  // ---------------- hill temple ----------------
  if (biome.id !== 'burnt') {
    const hillX = -halfW - (menu ? 10 : 12);
    const hillZ = -halfH - (menu ? 13 : 14);
    const hillTop = 2.9;
    const hill = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 9.2, hillTop, 9, 1),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(biome.ground.dark).offsetHSL(0, -0.04, 0.06), roughness: 1, flatShading: true }),
    );
    hill.position.set(hillX, hillTop / 2 - 0.1, hillZ);
    hill.receiveShadow = true;
    hill.castShadow = true;
    group.add(hill);

    // a few boulders at the foot so the hill reads as terrain, not a cone
    for (let i = 0; i < 8; i++) {
      const a = rand() * Math.PI * 2;
      const r = 8.5 + rand() * 2.4;
      addInst(rock, hillX + Math.cos(a) * r, 0.35, hillZ + Math.sin(a) * r, 1.1 + rand() * 1.3, 0.6 + rand() * 0.8, 0.9 + rand() * 1.1, colorNear(biome.ground.stone, 0.4, rand), a);
    }

    const terrace = new THREE.Mesh(
      new THREE.CylinderGeometry(5.0, 5.6, 0.55, 8),
      new THREE.MeshStandardMaterial({ color: biome.ground.stone, roughness: 0.95 }),
    );
    terrace.position.set(hillX, hillTop + 0.18, hillZ);
    terrace.receiveShadow = true;
    group.add(terrace);

    // moss and shrubs around the terrace edge
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rand() * 0.4;
      const r = 4.4 + rand() * 0.6;
      addInst(
        canopy,
        hillX + Math.cos(a) * r,
        hillTop + 0.5,
        hillZ + Math.sin(a) * r,
        0.32 + rand() * 0.2,
        0.2 + rand() * 0.12,
        0.32 + rand() * 0.2,
        colorNear(biome.tree.leafA, 0.6, rand),
        rand() * Math.PI,
      );
    }

    const pagoda = new THREE.Group();
    const pWood = new THREE.MeshStandardMaterial({ color: 0x594134, roughness: 0.9 });
    const pRoof = new THREE.MeshStandardMaterial({ color: biome.id === 'snow' ? 0x434d50 : 0x39322f, roughness: 0.86 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 4.6), pWood);
    base.position.y = 0.55;
    pagoda.add(base);
    for (let i = 0; i < 5; i++) {
      const size = 4.2 - i * 0.64;
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.58, 1.05, size * 0.58), pWood);
      body.position.y = 1.35 + i * 1.15;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(size, 0.18, size), pRoof);
      roof.position.y = 1.9 + i * 1.15;
      pagoda.add(body, roof);
    }
    const spire = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.35, 0.11),
      new THREE.MeshStandardMaterial({ color: 0xa98337, roughness: 0.4, metalness: 0.5 }),
    );
    spire.position.y = 7.45;
    pagoda.add(spire);
    pagoda.position.set(hillX, hillTop + 0.48, hillZ);
    pagoda.scale.setScalar(menu ? 0.66 : 0.8);
    // lit windows and a warm lamp at the foot of the pagoda
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xffcf8a, emissive: 0xff9a3c, emissiveIntensity: 1.1, roughness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.04), windowMat);
      w.position.set(0, 1.5 + i * 1.15, 2.35 - i * 0.02);
      pagoda.add(w);
    }
    pagoda.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    group.add(pagoda);
    const templeLight = new THREE.PointLight(0xffb15e, 9, 14, 2);
    templeLight.position.set(hillX + 1, hillTop + 2.5, hillZ + 5);
    group.add(templeLight);
    lights.push(templeLight);

    // Terrace lanterns and a few pines framing the hill
    for (const side of [-1, 1]) {
      const lx = hillX + side * 4.5;
      const lz = hillZ + 1.9;
      const stone = new THREE.MeshStandardMaterial({ color: biome.ground.stone, roughness: 0.95 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), stone);
      base.position.set(lx, hillTop + 0.53, lz);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 0.16), stone);
      stem.position.set(lx, hillTop + 0.82, lz);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.48), stone);
      cap.position.set(lx, hillTop + 1.2, lz);
      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.22, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xffc06a, emissive: 0xffa536, emissiveIntensity: 0.8, roughness: 0.4 }),
      );
      glow.position.set(lx, hillTop + 1.03, lz);
      group.add(base, stem, cap, glow);
    }
    for (let i = 0; i < 3; i++) {
      const a = -0.8 + i * 0.8;
      addTree(hillX + Math.cos(a) * 9.5, hillZ + 8.5 + Math.sin(a) * 2.2, 0.8 + rand() * 0.35);
    }
  }

  // ---------------- burnt shrine landmark ----------------
  if (biome.id === 'burnt') {
    const sx = -halfW - 9;
    const sz = -halfH - 13;
    const charMat = new THREE.MeshStandardMaterial({ color: 0x2a211d, roughness: 1 });
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff4a12, emissiveIntensity: 1.1, roughness: 0.5 });
    const shrine = new THREE.Group();
    const platform = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.5, 5.2), new THREE.MeshStandardMaterial({ color: 0x4b3a31, roughness: 1 }));
    platform.position.y = 0.2;
    shrine.add(platform);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), charMat);
      post.position.set(side * 2.3, 1.8, 0);
      post.rotation.z = side * 0.04;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.28, 0.38), charMat);
      beam.position.y = 3.2;
      beam.rotation.z = -0.06;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.2, 3.4), charMat);
      roof.position.set(0.3, 3.5, 0);
      roof.rotation.z = -0.12;
      shrine.add(post, beam, roof);
    }
    for (let i = 0; i < 5; i++) {
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), emberMat);
      ember.position.set((rand() - 0.5) * 5, 0.48, (rand() - 0.5) * 3);
      shrine.add(ember);
    }
    shrine.position.set(sx, 0, sz);
    shrine.rotation.y = 0.22;
    shrine.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    group.add(shrine);

    // smoke columns over the ruins
    const sc = document.createElement('canvas');
    sc.width = 128;
    sc.height = 256;
    const sctx = sc.getContext('2d')!;
    const sg = sctx.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0, 'rgba(78,70,66,0)');
    sg.addColorStop(0.22, 'rgba(78,70,66,0.32)');
    sg.addColorStop(0.76, 'rgba(56,50,48,0.28)');
    sg.addColorStop(1, 'rgba(56,50,48,0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 128, 256);
    const smokeTex = new THREE.CanvasTexture(sc);
    backdropTextures.push(smokeTex);
    smokeTex.colorSpace = THREE.SRGBColorSpace;
    const smokeMat = new THREE.MeshBasicMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0.7, fog: false, side: THREE.DoubleSide });
    for (const [x, z, h] of [[sx, sz, 18], [sx + 18, sz - 6, 26], [sx - 22, sz - 9, 22]] as const) {
      const smoke = new THREE.Mesh(new THREE.PlaneGeometry(9, h), smokeMat);
      smoke.position.set(x, h * 0.45, z);
      group.add(smoke);
      const smoke2 = smoke.clone();
      smoke2.rotation.y = Math.PI / 2;
      group.add(smoke2);
    }
  }

  // ---------------- atmospheric haze ----------------
  {
    const hc = document.createElement('canvas');
    hc.width = 512;
    hc.height = 128;
    const hctx = hc.getContext('2d')!;
    const hex = air.horizon.toString(16).padStart(6, '0');
    const rr = parseInt(hex.slice(0, 2), 16);
    const gg = parseInt(hex.slice(2, 4), 16);
    const bb = parseInt(hex.slice(4, 6), 16);
    const hg = hctx.createLinearGradient(0, 0, 0, 128);
    hg.addColorStop(0, `rgba(${rr},${gg},${bb},0)`);
    hg.addColorStop(0.46, `rgba(${rr},${gg},${bb},0.16)`);
    hg.addColorStop(0.72, `rgba(${rr},${gg},${bb},0.3)`);
    hg.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    hctx.fillStyle = hg;
    hctx.fillRect(0, 0, 512, 128);
    const hazeTex = new THREE.CanvasTexture(hc);
    backdropTextures.push(hazeTex);
    hazeTex.colorSpace = THREE.SRGBColorSpace;
    for (const [z, y, w, h, o] of [
      [-halfH - 15, 0.7, 300, 6.5, 0.56],
      [-halfH - 36, 2.2, 420, 8, 0.24],
      [-halfH - 76, 5.5, 620, 13, 0.18],
      [-halfH - 140, 9, 820, 20, 0.2],
    ] as const) {
      const hazeMat = new THREE.MeshBasicMaterial({ map: hazeTex, transparent: true, depthWrite: false, opacity: o, fog: false });
      const haze = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hazeMat);
      haze.position.set(0, y, z);
      group.add(haze);
    }
  }

  // trees behind the stream, never in the camera foreground
  if (!menu) {
    for (let i = 0; i < 5; i++) {
      addTree(-halfW - 2 + rand() * (halfW * 2 + 4), -halfH - 1.4 + rand() * 1.0, 0.8 + rand() * 0.5);
    }
  }

  // ---------------- instanced fills ----------------
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const rockGeo = new THREE.DodecahedronGeometry(0.7, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
  const grassAssets = getGrassAssets();
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grassAssets.tex,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
  });
  let grassTimeUniform: { value: number } | null = null;
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    grassTimeUniform = shader.uniforms.uTime as { value: number };
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 iOrigin = instanceMatrix[3].xyz;
        float bend = sin(uTime * 1.35 + iOrigin.x * 0.6 + iOrigin.z * 0.45) * 0.055 * position.y * position.y;
        transformed.x += bend;
        transformed.z += bend * 0.55;
      #endif`,
    );
  };
  grassMat.customProgramCacheKey = () => 'movestop-grass-sway';
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const fallenGeo = new THREE.PlaneGeometry(0.24, 0.12);
  fallenGeo.rotateX(-Math.PI / 2);
  const fallenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });

  const trunkMesh = buildInstanced(trunk, boxGeo, trunkMat, true, true);
  if (trunkMesh) group.add(trunkMesh);
  const canopyMesh = buildInstanced(canopy, boxGeo, canopyMat, true, true);
  if (canopyMesh) group.add(canopyMesh);
  const rockMesh = buildInstanced(rock, rockGeo, rockMat, true, true);
  if (rockMesh) group.add(rockMesh);

  // petals/leaves on the ground
  const fallenMesh = buildInstanced(fallen, fallenGeo, fallenMat, false, true);
  if (fallenMesh) group.add(fallenMesh);

  // grass is added last so it can overlap low props
  const grassMesh = buildInstanced(grass, grassAssets.geo, grassMat, false, false);
  if (grassMesh) group.add(grassMesh);
  const flowerMesh = buildInstanced(flower, boxGeo, flowerMat, false, false);
  if (flowerMesh) group.add(flowerMesh);

  // ---------------- torii ----------------
  if (biome.torii) {
    const red = new THREE.MeshStandardMaterial({ color: biome.id === 'clock' ? 0x7c2a2a : 0xb03b2a, roughness: 0.75 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x28211d, roughness: 0.85 });
    const torii = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(0.22, 2.9, 0.22);
    const p1 = new THREE.Mesh(pillarGeo, red);
    p1.position.set(-1.6, 1.45, 0);
    const p2 = p1.clone();
    p2.position.x = 1.6;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.26, 0.32), red);
    beam.position.y = 2.72;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.16, 0.42), dark);
    cap.position.y = 2.92;
    const beam2 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 0.24), red);
    beam2.position.y = 2.18;
    torii.add(p1, p2, beam, cap, beam2);
    torii.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    torii.position.set(trailX(-halfH - 1.25, halfH, biome), 0, -halfH - 1.25);
    torii.rotation.y = biome.id === 'burnt' ? 0.2 : 0;
    torii.scale.setScalar(1.05);
    group.add(torii);
  }

  // ---------------- banners ----------------
  if (biome.banners) {
    const btex = tex.banners;
    const geo = new THREE.BoxGeometry(0.62, 1.2, 0.025);
    for (let i = 0; i < 2; i++) {
      const bannerMat = new THREE.MeshStandardMaterial({ map: btex[i], roughness: 0.9, side: THREE.DoubleSide });
      const banner = new THREE.Mesh(geo, bannerMat);
      banner.position.set(i === 0 ? -halfW + 2.6 : halfW - 2.6, 1.35, -halfH + 0.45);
      banner.rotation.y = 0;
      banner.castShadow = true;
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 0.06), new THREE.MeshStandardMaterial({ color: 0x2a211c, roughness: 0.9 }));
      pole.position.set(banner.position.x + 0.38, 1.1, banner.position.z - 0.02);
      pole.castShadow = true;
      group.add(banner, pole);
    }
  }

  // ---------------- stone lanterns + lights ----------------
  if (biome.lanterns) {
    const stone = new THREE.MeshStandardMaterial({ color: biome.ground.stone, roughness: 0.95 });
    const glow = new THREE.MeshStandardMaterial({
      color: 0xffc06a,
      emissive: 0xffa536,
      emissiveIntensity: 0.85,
      roughness: 0.4,
    });
    const positions: [number, number][] = menu ? [[-3.2, -2.4], [0.75, -4.3]] : [
      [-halfW + 1.0, -halfH + 1.0],
      [halfW - 1.0, halfH - 1.0],
    ];
    for (const [x, z] of positions) {
      const lantern = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.46), stone);
      base.position.y = 0.08;
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.55, 0.17), stone);
      stem.position.y = 0.42;
      const lightBox = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.36), glow);
      lightBox.position.y = 0.86;
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.52), stone);
      cap.position.y = 1.08;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), stone);
      tip.position.y = 1.18;
      lantern.add(base, stem, lightBox, cap, tip);
      lantern.position.set(x, 0, z);
      lantern.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.castShadow = true;
      });
      group.add(lantern);
      const light = new THREE.PointLight(0xffb15e, biome.id === 'snow' ? 7 : 5, 6.5, 2);
      light.position.set(x, 1.1, z);
      group.add(light);
      lights.push(light);
    }
  }

  // ---------------- shrine dressing / houses ----------------
  if (biome.id === 'siege' || biome.id === 'sakura' || biome.id === 'rain') {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xd8cfbd, roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ color: biome.id === 'rain' ? 0x354044 : 0x3c3028, roughness: 0.85 });
    for (const side of [-1, 1]) {
      const house = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.5, 2.2), wallMat);
      body.position.y = 0.75;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.22, 2.7), roofMat);
      roof.position.y = 1.6;
      const roof2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 2.4), roofMat);
      roof2.position.y = 1.8;
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.05), roofMat);
      door.position.set(0, 0.55, 1.13);
      house.add(body, roof, roof2, door);
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 2.6), new THREE.MeshStandardMaterial({ color: biome.ground.stone, roughness: 0.95 }));
      foundation.position.set(side * (halfW + 5.2), 0.12, -halfH - 2.1);
      group.add(foundation);
      house.position.set(side * (halfW + 5.2), 0.22, -halfH - 2.1);
      house.rotation.y = side * -0.25;
      house.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      group.add(house);
    }
  }

  // ---------------- weather ----------------
  const particles = new WeatherParticles(biome, halfW, halfH);
  group.add(particles.mesh);

  return {
    group,
    lights,
    update: (dt: number, timeScale = 1) => {
      particles.setTimeScale(timeScale);
      particles.update(dt);
      if (grassTimeUniform) grassTimeUniform.value += dt;
      if (waterTex) waterTex.offset.x += dt * 0.018;
    },
    dispose: () => {
      groundTex.dispose();
      waterTex?.dispose();
      for (const texture of backdropTextures) texture.dispose();
      particles.dispose();
    },
  };
}

export { WeatherParticles };
