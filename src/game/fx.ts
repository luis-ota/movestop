import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  gravity: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  startScale: number;
}

interface Ring {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  growth: number;
  baseOpacity: number;
}

interface SlashFx {
  group: THREE.Group;
  life: number;
  max: number;
  grow: number;
}

interface Arc {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  max: number;
  size: number;
}

interface Ghost {
  group: THREE.Group;
  life: number;
  max: number;
  materials: THREE.MeshBasicMaterial[];
}

const MAX_PARTICLES = 240;

/** Tiny voxel debris, sparks and shockwaves. No texture assets. */
export class FX {
  readonly group = new THREE.Group();
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private slashes: SlashFx[] = [];
  private ghosts: Ghost[] = [];
  private arcs: Arc[] = [];
  private slashTex: THREE.CanvasTexture | null = null;
  private ringTex: THREE.CanvasTexture | null = null;
  private geo = new THREE.BoxGeometry(1, 1, 1);
  private ringGeo = new THREE.RingGeometry(0.82, 1, 40);
  private mats = new Map<number, THREE.MeshStandardMaterial>();
  private rnd = Math.random;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private mat(color: number): THREE.MeshStandardMaterial {
    let m = this.mats.get(color);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.55,
        metalness: 0.1,
      });
      this.mats.set(color, m);
    }
    return m;
  }

  debris(x: number, y: number, z: number, color: number, count: number, power = 3.4, size = 0.11): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const mesh = new THREE.Mesh(this.geo, this.mat(color));
      const s = size * (0.55 + this.rnd() * 0.9);
      const scale = new THREE.Vector3(s, s, s);
      mesh.scale.copy(scale);
      mesh.position.set(x + (this.rnd() - 0.5) * 0.35, y, z + (this.rnd() - 0.5) * 0.35);
      mesh.rotation.set(this.rnd() * 3, this.rnd() * 3, this.rnd() * 3);
      const ang = this.rnd() * Math.PI * 2;
      const speed = power * (0.35 + this.rnd() * 0.9);
      const life = 0.45 + this.rnd() * 0.6;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * speed,
        vy: 1.5 + this.rnd() * power,
        vz: Math.sin(ang) * speed,
        life,
        max: life,
        gravity: 10,
        spinX: (this.rnd() - 0.5) * 10,
        spinY: (this.rnd() - 0.5) * 10,
        spinZ: (this.rnd() - 0.5) * 10,
        startScale: s,
      });
      this.group.add(mesh);
    }
  }

  sparks(x: number, y: number, z: number, color: number, count = 5, power = 5): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const mesh = new THREE.Mesh(this.geo, this.mat(color));
      const s = 0.035 + this.rnd() * 0.045;
      mesh.scale.setScalar(s);
      mesh.position.set(x, y, z);
      const ang = this.rnd() * Math.PI * 2;
      const p = power * (0.4 + this.rnd());
      const life = 0.18 + this.rnd() * 0.24;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * p,
        vy: 0.6 + this.rnd() * power * 0.7,
        vz: Math.sin(ang) * p,
        life,
        max: life,
        gravity: 14,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        startScale: s,
      });
      this.group.add(mesh);
    }
  }

  ring(x: number, z: number, color: number, radius = 1, life = 0.5): void {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.ringGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.04, z);
    mesh.scale.setScalar(radius * 0.35);
    this.rings.push({ mesh, life, max: life, growth: radius * 1.7, baseOpacity: 0.8 });
    this.group.add(mesh);
  }

  shock(x: number, z: number, color: number, radius = 2.4): void {
    this.ring(x, z, color, radius, 0.55);
    this.ring(x, z, 0xffffff, radius * 0.7, 0.35);
    this.debris(x, 0.2, z, color, 12, 5, 0.09);
    this.sparks(x, 0.5, z, 0xffd28a, 16, 8);
  }

  private getSlashTexture(ring: boolean): THREE.CanvasTexture {
    if (ring && this.ringTex) return this.ringTex;
    if (!ring && this.slashTex) return this.slashTex;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    ctx.translate(128, 128);
    ctx.lineCap = 'round';
    const drawArc = (start: number, end: number) => {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 30;
      ctx.beginPath();
      ctx.arc(0, 0, 78, start, end);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.arc(0, 0, 78, start, end);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 91, start + 0.04, end - 0.04);
      ctx.stroke();
    };
    if (ring) {
      drawArc(-Math.PI * 0.92, Math.PI * 0.92);
    } else {
      drawArc(-1.12, 1.12);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (ring) this.ringTex = tex;
    else this.slashTex = tex;
    return tex;
  }

  private addArc(x: number, z: number, angle: number, color: number, radius: number, finisher: boolean): void {
    const mat = new THREE.MeshBasicMaterial({
      map: this.getSlashTexture(finisher),
      color: 0xfff3dd,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.position.set(x + Math.sin(angle) * 1.3, 0.82, z + Math.cos(angle) * 1.3);
    mesh.scale.setScalar(radius * 3.0);
    mesh.rotation.z = angle - Math.PI / 2;
    mesh.renderOrder = 12;
    this.group.add(mesh);
    this.arcs.push({ mesh, mat, life: 0.36, max: 0.36, size: radius * 2.5 });
  }

  slash(x: number, z: number, angle: number, color: number, radius: number, finisher = false): void {
    this.addArc(x, z, angle, color, radius, finisher);
    const group = new THREE.Group();
    const span = finisher ? Math.PI * 2 : 2.5;
    const start = angle - Math.PI / 2 - span / 2;
    const mainGeo = new THREE.RingGeometry(radius * 0.42, radius, 48, 1, start, span);
    const edgeGeo = new THREE.RingGeometry(radius * 0.9, radius * 1.02, 48, 1, start + 0.03, Math.max(0.1, span - 0.06));
    const mainMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0xfff3da,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const main = new THREE.Mesh(mainGeo, mainMat);
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    main.rotation.x = -Math.PI / 2;
    edge.rotation.x = -Math.PI / 2;
    main.position.y = 0.52;
    edge.position.y = 0.535;
    group.add(main, edge);
    group.position.set(x, 0, z);
    this.group.add(group);
    this.slashes.push({ group, life: 0.34, max: 0.34, grow: finisher ? 1.22 : 1.1 });
  }

  specialLine(x0: number, z0: number, x1: number, z1: number, color: number): void {
    this.addArc(x1, z1, Math.atan2(x1 - x0, z1 - z0), color, 3.6, true);
    const group = new THREE.Group();
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz) || 1;
    const angle = Math.atan2(dx, dz);
    const glowGeo = new THREE.BoxGeometry(0.8, 0.02, len + 1.8);
    const coreGeo = new THREE.BoxGeometry(0.15, 0.025, len + 1.5);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff4dc,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    const core = new THREE.Mesh(coreGeo, coreMat);
    glow.position.y = 0.62;
    core.position.y = 0.64;
    const wallGlow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, len + 1.4), new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }));
    const wallCore = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, len + 1.2), new THREE.MeshBasicMaterial({
      color: 0xfff4dc,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }));
    wallGlow.position.y = 1.2;
    wallCore.position.y = 1.2;
    group.add(glow, core, wallGlow, wallCore);
    group.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    group.rotation.y = angle;
    this.group.add(group);
    this.slashes.push({ group, life: 0.42, max: 0.42, grow: 1.0 });
  }

  afterimage(x: number, z: number, angle: number, color: number): void {
    const group = new THREE.Group();
    const materials: THREE.MeshBasicMaterial[] = [];
    const parts: [number, number, number, number, number, number][] = [
      [0.46, 0.44, 0.3, 0, 0.52, 0],
      [0.28, 0.28, 0.28, 0, 0.87, 0],
      [0.14, 0.3, 0.17, -0.13, 0.15, 0],
      [0.14, 0.3, 0.17, 0.13, 0.15, 0],
    ];
    for (const [w, h, d, px, py, pz] of parts) {
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.scale.set(w, h, d);
      mesh.position.set(px, py, pz);
      group.add(mesh);
      materials.push(mat);
    }
    group.position.set(x, 0, z);
    group.rotation.y = angle;
    this.group.add(group);
    this.ghosts.push({ group, life: 0.32, max: 0.32, materials });
  }

  dust(x: number, z: number, color: number, count = 3): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const mesh = new THREE.Mesh(this.geo, this.mat(color));
      const s = 0.035 + this.rnd() * 0.05;
      mesh.scale.setScalar(s);
      mesh.position.set(x + (this.rnd() - 0.5) * 0.5, 0.07, z + (this.rnd() - 0.5) * 0.5);
      const ang = this.rnd() * Math.PI * 2;
      const life = 0.3 + this.rnd() * 0.35;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * (0.4 + this.rnd() * 0.8),
        vy: 0.3 + this.rnd() * 0.5,
        vz: Math.sin(ang) * (0.4 + this.rnd() * 0.8),
        life,
        max: life,
        gravity: 1.4,
        spinX: 0,
        spinY: 0,
        spinZ: 0,
        startScale: s,
      });
      this.group.add(mesh);
    }
  }

  confetti(x: number, z: number): void {
    const colors = [0xf2b51c, 0xe23b2e, 0x0fbfb6, 0xf1eee4, 0xff3d9a];
    for (let i = 0; i < 34; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      const color = colors[i % colors.length];
      const mesh = new THREE.Mesh(this.geo, this.mat(color));
      const s = 0.07 + this.rnd() * 0.08;
      mesh.scale.setScalar(s);
      mesh.position.set(x + (this.rnd() - 0.5) * 3, 1.2 + this.rnd() * 1.5, z + (this.rnd() - 0.5) * 3);
      const ang = this.rnd() * Math.PI * 2;
      const life = 1.2 + this.rnd() * 1.1;
      this.particles.push({
        mesh,
        vx: Math.cos(ang) * (1.2 + this.rnd() * 2.2),
        vy: 3 + this.rnd() * 4,
        vz: Math.sin(ang) * (1.2 + this.rnd() * 2.2),
        life,
        max: life,
        gravity: 4.5,
        spinX: (this.rnd() - 0.5) * 12,
        spinY: (this.rnd() - 0.5) * 12,
        spinZ: (this.rnd() - 0.5) * 12,
        startScale: s,
      });
      this.group.add(mesh);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.03) {
        p.mesh.position.y = 0.03;
        p.vy = Math.abs(p.vy) * 0.3;
        p.vx *= 0.7;
        p.vz *= 0.7;
      }
      p.mesh.rotation.x += p.spinX * dt;
      p.mesh.rotation.y += p.spinY * dt;
      p.mesh.rotation.z += p.spinZ * dt;
      const t = Math.min(1, p.life / (p.max * 0.55));
      p.mesh.scale.setScalar(Math.max(0.001, p.startScale * t));
    }

    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const a = this.arcs[i];
      a.life -= dt;
      if (a.life <= 0) {
        this.group.remove(a.mesh);
        a.mesh.geometry.dispose();
        a.mat.dispose();
        this.arcs.splice(i, 1);
        continue;
      }
      const t = 1 - a.life / a.max;
      const scale = a.size * (0.9 + t * 0.25);
      a.mesh.scale.setScalar(scale);
      a.mat.opacity = 1 * (1 - t);
    }

    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.group.remove(s.group);
        s.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            m.geometry.dispose();
            (m.material as THREE.Material).dispose();
          }
        });
        this.slashes.splice(i, 1);
        continue;
      }
      const t = 1 - s.life / s.max;
      s.group.scale.setScalar(0.92 + t * (s.grow - 0.92));
      s.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = (m === s.group.children[0] ? 0.8 : 0.9) * (1 - t) * (1 - t);
      });
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.life -= dt;
      if (g.life <= 0) {
        this.group.remove(g.group);
        for (const m of g.materials) m.dispose();
        this.ghosts.splice(i, 1);
        continue;
      }
      const t = g.life / g.max;
      for (const m of g.materials) m.opacity = 0.34 * t;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.group.remove(r.mesh);
        (r.mesh.material as THREE.Material).dispose();
        this.rings.splice(i, 1);
        continue;
      }
      const t = 1 - r.life / r.max;
      r.mesh.scale.setScalar(0.35 + t * r.growth);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = r.baseOpacity * (1 - t);
    }
  }

  clear(): void {
    for (const p of this.particles) this.group.remove(p.mesh);
    this.particles.length = 0;
    for (const r of this.rings) {
      this.group.remove(r.mesh);
      (r.mesh.material as THREE.Material).dispose();
    }
    this.rings.length = 0;
    for (const s of this.slashes) {
      this.group.remove(s.group);
      s.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    }
    this.slashes.length = 0;
    for (const g of this.ghosts) {
      this.group.remove(g.group);
      for (const m of g.materials) m.dispose();
    }
    this.ghosts.length = 0;
    for (const a of this.arcs) {
      this.group.remove(a.mesh);
      a.mesh.geometry.dispose();
      a.mat.dispose();
    }
    this.arcs.length = 0;
  }
}
