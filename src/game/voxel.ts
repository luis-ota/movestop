import * as THREE from 'three';
import type { SkinDef } from './catalog';

const box = new THREE.BoxGeometry(1, 1, 1);

let contactTex: THREE.CanvasTexture | null = null;

/** A soft pool of shade that grounds the voxel figure even without shadow maps. */
const crestTextures = new Map<number, THREE.CanvasTexture>();

function getCrestTexture(accent: number): THREE.CanvasTexture {
  const cached = crestTextures.get(accent);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const col = new THREE.Color(accent);
  const lum = 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b;
  const ink = lum > 0.38 ? '#201b18' : '#fff2dd';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, 104, 104);
  ctx.fillStyle = ink;
  ctx.font = '700 82px "Noto Serif JP", "Shippori Mincho", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('止', 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  crestTextures.set(accent, tex);
  return tex;
}

function contactShadow(size: number): THREE.Mesh {
  if (!contactTex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(16,18,15,0.55)');
    g.addColorStop(0.5, 'rgba(16,18,15,0.3)');
    g.addColorStop(1, 'rgba(16,18,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    contactTex = new THREE.CanvasTexture(c);
    contactTex.colorSpace = THREE.SRGBColorSpace;
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.014;
  mesh.renderOrder = 1;
  return mesh;
}

function voxel(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(box, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = false;
  return m;
}

export class PlayerAvatar {
  readonly group = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
  private accentMat: THREE.MeshStandardMaterial;
  private weaponMat: THREE.MeshStandardMaterial;
  private clothMat: THREE.MeshStandardMaterial;
  private haoriMat: THREE.MeshStandardMaterial;
  private legL: THREE.Mesh;
  private legR: THREE.Mesh;
  private armL: THREE.Mesh;
  private armR: THREE.Mesh;
  private blade: THREE.Mesh;
  private torso: THREE.Mesh;
  private head: THREE.Mesh;
  private hat: THREE.Group;
  private katana: THREE.Group;
  private phase = 0;
  private parryPulse = 0;
  private slashPulse = 0;
  private slashMax = 1;
  private slashCombo = 0;

  constructor(skin: SkinDef) {
    this.bodyMat = new THREE.MeshStandardMaterial({ color: skin.body, roughness: 0.7, metalness: 0.06 });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: skin.accent,
      emissive: skin.accent,
      emissiveIntensity: 1.2,
      roughness: 0.45,
    });
    this.weaponMat = new THREE.MeshStandardMaterial({ color: skin.weapon, roughness: 0.48, metalness: 0.35 });
    this.clothMat = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.92 });
    this.haoriMat = new THREE.MeshStandardMaterial({ color: skin.accent, roughness: 0.86 });

    this.legL = voxel(0.14, 0.3, 0.17, this.bodyMat, -0.13, 0.15, 0);
    this.legR = voxel(0.14, 0.3, 0.17, this.bodyMat, 0.13, 0.15, 0);
    this.armL = voxel(0.1, 0.34, 0.12, this.bodyMat, -0.28, 0.5, 0.02);
    const armR = voxel(0.1, 0.3, 0.12, this.bodyMat, 0.28, 0.54, 0.06);
    this.armR = armR;
    this.torso = voxel(0.46, 0.44, 0.3, this.bodyMat, 0, 0.52, 0);
    const obi = voxel(0.48, 0.07, 0.32, this.accentMat, 0, 0.34, 0);
    const lapel = voxel(0.1, 0.4, 0.02, this.clothMat, 0.08, 0.52, 0.16);
    this.head = voxel(0.28, 0.28, 0.28, this.bodyMat, 0, 0.87, 0);
    const visor = voxel(0.19, 0.045, 0.02, this.accentMat, 0, 0.9, 0.15);

    // kasa / straw hat
    this.hat = new THREE.Group();
    const brim = voxel(0.6, 0.045, 0.6, this.weaponMat, 0, 1.01, 0);
    const crown = voxel(0.25, 0.12, 0.25, this.weaponMat, 0, 1.08, 0);
    const band = voxel(0.27, 0.03, 0.27, this.accentMat, 0, 1.03, 0);
    this.hat.add(brim, crown, band);

    // tanegashima (matchlock) in the right hand
    const gun = voxel(0.07, 0.08, 0.44, this.weaponMat, 0.28, 0.54, 0.28);
    const stock = voxel(0.06, 0.12, 0.16, this.clothMat, 0.28, 0.5, 0.06);
    const tip = voxel(0.045, 0.045, 0.05, this.accentMat, 0.28, 0.55, 0.51);

    // katana resting at the hip
    this.katana = new THREE.Group();
    const sheath = voxel(0.055, 0.055, 0.78, this.clothMat, 0, 0, 0);
    const guard = voxel(0.1, 0.1, 0.025, this.accentMat, 0, 0, 0.36);
    const hilt = voxel(0.05, 0.05, 0.2, this.weaponMat, 0, 0, 0.46);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe9f0e8, emissive: skin.accent, emissiveIntensity: 0.5, roughness: 0.28, metalness: 0.68 });
    this.blade = voxel(0.035, 0.03, 0.95, bladeMat, 0, 0, 0.64);
    this.blade.visible = false;
    this.katana.add(sheath, guard, hilt, this.blade);
    this.katana.position.set(-0.33, 0.5, -0.06);
    this.katana.rotation.y = 0.55;
    this.katana.rotation.z = 0.08;

    this.group.add(contactShadow(0.92));

    // the camera lives behind the ronin: give the back a red haori and a seal
    const haori = voxel(0.46, 0.36, 0.032, this.haoriMat, 0, 0.55, -0.17);
    const trim = voxel(0.47, 0.035, 0.034, this.clothMat, 0, 0.38, -0.171);
    const crest = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.22),
      new THREE.MeshBasicMaterial({
        map: getCrestTexture(skin.accent),
        transparent: true,
        side: THREE.DoubleSide,
        // a flat plane: one pass draws both faces (see FLAT_TRANSPARENT note in fx.ts)
        forceSinglePass: true,
        toneMapped: false,
      }),
    );
    crest.position.set(0, 0.58, -0.191);
    crest.rotation.y = Math.PI;
    this.group.add(haori, trim, crest);

    this.group.add(
      this.legL,
      this.legR,
      this.armL,
      armR,
      this.torso,
      obi,
      lapel,
      this.head,
      visor,
      this.hat,
      gun,
      stock,
      tip,
      this.katana,
    );
  }

  setSkin(skin: SkinDef): void {
    this.bodyMat.color.setHex(skin.body);
    this.accentMat.color.setHex(skin.accent);
    this.accentMat.emissive.setHex(skin.accent);
    this.weaponMat.color.setHex(skin.weapon);
    this.haoriMat.color.setHex(skin.accent);
  }

  pulseParry(): void {
    this.parryPulse = 1;
  }

  slash(combo: number, dashing = false): void {
    this.slashPulse = dashing ? 1.3 : 1;
    this.slashMax = this.slashPulse;
    this.slashCombo = combo;
    this.blade.visible = true;
  }

  iai(): void {
    this.slashPulse = 1.65;
    this.slashMax = this.slashPulse;
    this.slashCombo = 2;
    this.blade.visible = true;
    this.parryPulse = 1;
  }

  /** A quiet, drawn-blade pose used by the roster renderer. */
  stance(): void {
    this.katana.position.set(-0.34, 0.61, 0.1);
    this.katana.rotation.set(0.1, -0.48, -0.62);
    this.blade.visible = true;
    this.parryPulse = 0;
    this.torso.rotation.y = 0.13;
    this.hat.rotation.z = 0.035;
  }

  animate(dt: number, moving: boolean, timeScale: number, dashing = false): void {
    if (moving) this.phase += dt * (dashing ? 18 : 10.5);
    const swing = moving ? Math.sin(this.phase) : 0;
    const eased = moving ? 1 : 0.22;
    this.legL.rotation.x = swing * 0.8 * eased + (dashing ? 0.35 : 0);
    this.legR.rotation.x = -swing * 0.8 * eased + (dashing ? 0.1 : 0);
    this.armL.rotation.x = -swing * 0.55 * eased + (dashing ? 0.4 : 0);
    const bob = moving ? Math.abs(Math.sin(this.phase)) * 0.035 : Math.sin(performance.now() * 0.0024) * 0.012;
    this.torso.position.y = 0.52 + bob;
    this.head.position.y = 0.87 + bob;
    this.hat.position.y = bob;
    this.torso.rotation.x = (moving ? 0.07 : 0.02) + (dashing ? 0.26 : 0);
    this.head.rotation.x = dashing ? -0.12 : 0;
    this.hat.rotation.x = dashing ? -0.18 : 0;
    this.parryPulse = Math.max(0, this.parryPulse - dt * 3.2);
    this.slashPulse = Math.max(0, this.slashPulse - dt * 4.6);

    if (this.slashPulse > 0) {
      const progress = 1 - this.slashPulse / this.slashMax;
      const arc = Math.sin(Math.min(1, progress) * Math.PI);
      const heavy = this.slashCombo === 2 ? 1.25 : 1;
      const swingSlash = arc * heavy;
      this.katana.position.set(-0.33 + swingSlash * 0.52, 0.5 + swingSlash * 0.12, -0.06);
      this.katana.rotation.y = 0.55 - swingSlash * 2.15;
      this.katana.rotation.z = 0.08 - swingSlash * 1.18 + this.parryPulse * 0.9;
      this.katana.rotation.x = -swingSlash * 0.35;
      this.armR.rotation.x = -swingSlash * 1.9;
      this.torso.rotation.y = -swingSlash * 0.42;
      this.blade.visible = this.slashPulse > 0.015;
    } else {
      this.katana.position.set(-0.33, 0.5, -0.06);
      this.katana.rotation.y += (0.55 - this.katana.rotation.y) * Math.min(1, dt * 12);
      this.katana.rotation.z += (0.08 + this.parryPulse * 0.9 - this.katana.rotation.z) * Math.min(1, dt * 12);
      this.katana.rotation.x += (0 - this.katana.rotation.x) * Math.min(1, dt * 12);
      this.armR.rotation.x += (0 - this.armR.rotation.x) * Math.min(1, dt * 12);
      this.torso.rotation.y += (0 - this.torso.rotation.y) * Math.min(1, dt * 12);
      this.blade.visible = false;
    }
    this.accentMat.emissiveIntensity = 0.9 + timeScale * 0.7 + this.parryPulse * 2.4 + this.slashPulse * 0.7;

  }
}

export class EnemyAvatar {
  readonly group = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
  private darkMat: THREE.MeshStandardMaterial;
  private eyeMat: THREE.MeshStandardMaterial;
  private eyeL: THREE.Mesh;
  private eyeR: THREE.Mesh;
  private ring: THREE.Mesh;
  private phase = 0;
  private flashValue = 0;
  /** stone does not breathe: no idle bob */
  private readonly still: boolean;
  /** materials that fade with setOpacity, with their resting opacity */
  private fadeMats: { mat: THREE.Material; base: number }[] = [];
  private fadeMeshes: THREE.Mesh[] = [];
  private opacity = 1;

  constructor(accent: number, body: number, scale: number, type: string) {
    this.still = type === 'statue';
    this.phase = Math.random() * Math.PI * 2;
    this.bodyMat = new THREE.MeshStandardMaterial({ color: body, roughness: 0.62, metalness: 0.1 });
    this.darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2026, roughness: 0.72 });
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: 0xfff0d8,
      emissive: accent,
      emissiveIntensity: 1.3,
      roughness: 0.35,
    });

    const legL = voxel(0.15, 0.26, 0.18, this.darkMat, -0.13, 0.13, 0);
    const legR = voxel(0.15, 0.26, 0.18, this.darkMat, 0.13, 0.13, 0);
    const torso = voxel(0.5, 0.46, 0.34, this.bodyMat, 0, 0.48, 0);
    const shoulder = voxel(0.56, 0.12, 0.36, this.darkMat, 0, 0.68, 0);
    const head = voxel(0.34, 0.3, 0.3, this.bodyMat, 0, 0.87, 0);
    const mask = voxel(0.27, 0.17, 0.035, this.darkMat, 0, 0.86, 0.16);
    this.eyeL = voxel(0.055, 0.055, 0.025, this.eyeMat, -0.062, 0.88, 0.19);
    this.eyeR = voxel(0.055, 0.055, 0.025, this.eyeMat, 0.062, 0.88, 0.19);
    const hornL = voxel(0.055, 0.18, 0.055, this.darkMat, -0.14, 1.06, 0);
    hornL.rotation.z = 0.35;
    const hornR = voxel(0.055, 0.18, 0.055, this.darkMat, 0.14, 1.06, 0);
    hornR.rotation.z = -0.35;
    const knot = voxel(0.08, 0.08, 0.08, this.bodyMat, 0, 1.03, -0.05);
    this.group.add(legL, legR, torso, shoulder, head, mask, this.eyeL, this.eyeR, knot);
    // the statue, the ninja and the ronin have their own head silhouettes
    if (type !== 'statue' && type !== 'ninja' && type !== 'ronin') this.group.add(hornL, hornR);

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x3a3138, roughness: 0.4, metalness: 0.4 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.9,
      roughness: 0.4,
    });

    if (type === 'gunner' || type === 'burster') {
      const rifle = voxel(0.06, 0.07, 0.36, gunMat, 0.29, 0.52, 0.28);
      this.group.add(rifle);
      if (type === 'burster') {
        this.group.add(voxel(0.06, 0.07, 0.36, gunMat, -0.29, 0.52, 0.28));
      }
    }
    if (type === 'sniper') {
      const rifle = voxel(0.05, 0.06, 0.72, gunMat, 0.29, 0.54, 0.34);
      const scope = voxel(0.09, 0.09, 0.16, accentMat, 0.29, 0.61, 0.34);
      this.group.add(rifle, scope);
    }
    if (type === 'hunter') {
      const bladeL = voxel(0.04, 0.05, 0.46, accentMat, -0.34, 0.5, 0.18);
      bladeL.rotation.x = -0.35;
      const bladeR = voxel(0.04, 0.05, 0.46, accentMat, 0.34, 0.5, 0.18);
      bladeR.rotation.x = -0.35;
      this.group.add(bladeL, bladeR);
    }
    if (type === 'shield') {
      const plate = voxel(0.82, 0.9, 0.07, this.darkMat, 0, 0.55, 0.36);
      const rimTop = voxel(0.86, 0.06, 0.09, accentMat, 0, 0.98, 0.36);
      const rimBot = voxel(0.86, 0.06, 0.09, accentMat, 0, 0.12, 0.36);
      this.group.add(plate, rimTop, rimBot);
    }
    if (type === 'mortar') {
      const helmet = voxel(0.66, 0.12, 0.58, this.darkMat, 0, 1.04, 0);
      const cannon = voxel(0.22, 0.22, 0.68, gunMat, 0.24, 0.58, 0.42);
      cannon.rotation.x = -0.18;
      const tubeL = voxel(0.1, 0.42, 0.1, accentMat, -0.2, 0.68, -0.2);
      const tubeR = voxel(0.1, 0.42, 0.1, accentMat, 0.2, 0.68, -0.2);
      this.group.add(helmet, cannon, tubeL, tubeR);
    }
    if (type === 'warden') {
      const hat = voxel(0.78, 0.08, 0.7, this.darkMat, 0, 1.09, 0);
      const sleeveL = voxel(0.24, 0.34, 0.32, this.bodyMat, -0.35, 0.5, 0);
      const sleeveR = voxel(0.24, 0.34, 0.32, this.bodyMat, 0.35, 0.5, 0);
      const staff = voxel(0.055, 1.05, 0.055, gunMat, 0.4, 0.56, 0.18);
      const talisman = voxel(0.13, 0.2, 0.025, accentMat, 0.46, 0.91, 0.2);
      talisman.rotation.z = -0.12;
      this.group.add(hat, sleeveL, sleeveR, staff, talisman);
    }
    if (type === 'statue') {
      // a roadside jizō: rounded stone cap, red bib, hands folded, a plinth under the feet
      this.bodyMat.roughness = 0.96;
      this.bodyMat.metalness = 0;
      const bibMat = new THREE.MeshStandardMaterial({ color: 0xb8322a, roughness: 0.8 });
      const cap = voxel(0.4, 0.1, 0.36, this.bodyMat, 0, 1.04, 0);
      const bib = voxel(0.46, 0.22, 0.05, bibMat, 0, 0.6, 0.18);
      const hands = voxel(0.18, 0.12, 0.1, this.bodyMat, 0, 0.47, 0.2);
      const plinth = voxel(0.66, 0.1, 0.52, this.darkMat, 0, 0.05, 0);
      this.group.add(cap, bib, hands, plinth);
    }
    if (type === 'ninja') {
      const hood = voxel(0.38, 0.12, 0.34, this.darkMat, 0, 0.99, 0);
      const scarf = voxel(0.06, 0.06, 0.34, accentMat, 0, 0.95, -0.3);
      scarf.rotation.x = 0.3;
      const sheath = voxel(0.05, 0.85, 0.05, gunMat, 0, 0.6, -0.2);
      sheath.rotation.z = 0.7;
      const blade = voxel(0.04, 0.05, 0.42, accentMat, 0.3, 0.5, 0.2);
      this.group.add(hood, scarf, sheath, blade);
    }
    if (type === 'ronin') {
      // wide straw kasa, long coat, katana at the hip, bow and quiver on the back
      const strawMat = new THREE.MeshStandardMaterial({ color: 0xc8a96a, roughness: 0.9 });
      const brim = voxel(0.92, 0.05, 0.92, strawMat, 0, 1.06, 0);
      const crown = voxel(0.46, 0.12, 0.46, strawMat, 0, 1.14, 0);
      const coatL = voxel(0.2, 0.42, 0.36, this.bodyMat, -0.34, 0.42, 0);
      const coatR = voxel(0.2, 0.42, 0.36, this.bodyMat, 0.34, 0.42, 0);
      const sash = voxel(0.54, 0.07, 0.38, accentMat, 0, 0.32, 0);
      const scabbard = voxel(0.05, 0.06, 0.7, this.darkMat, -0.3, 0.34, 0.12);
      scabbard.rotation.y = 0.2;
      const blade = voxel(0.04, 0.05, 0.62, accentMat, 0.34, 0.48, 0.3);
      blade.rotation.x = -0.25;
      const bow = voxel(0.05, 1.05, 0.05, gunMat, 0.12, 0.6, -0.24);
      bow.rotation.z = 0.35;
      const quiver = voxel(0.12, 0.42, 0.12, this.darkMat, -0.16, 0.7, -0.24);
      quiver.rotation.z = -0.3;
      this.group.add(brim, crown, coatL, coatR, sash, scabbard, blade, bow, quiver);
    }

    this.group.add(contactShadow(0.86));
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.56, 24),
      new THREE.MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true, // flat ring: see FLAT_TRANSPARENT note in fx.ts
      }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.015;
    this.group.add(this.ring);
    this.group.scale.setScalar(scale);

    if (type === 'ninja') {
      // cloaked bodies render transparent from the start so fading never recompiles shaders
      const seen = new Set<THREE.Material>();
      this.group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || mesh === this.ring) return;
        this.fadeMeshes.push(mesh);
        const mat = mesh.material as THREE.Material;
        if (seen.has(mat)) return;
        seen.add(mat);
        mat.transparent = true;
        this.fadeMats.push({ mat, base: mat.opacity });
      });
    }
  }

  /** 0..1. Only cloaked enemies (built with fade materials) react. */
  setOpacity(v: number): void {
    if (this.fadeMats.length === 0 || Math.abs(v - this.opacity) < 0.002) return;
    this.opacity = v;
    for (const { mat, base } of this.fadeMats) mat.opacity = base * v;
    // a fully shaded silhouette would give the hidden body away on desktop only
    const shadow = v > 0.5;
    for (const mesh of this.fadeMeshes) {
      if (mesh.castShadow !== shadow && mesh.geometry === box) mesh.castShadow = shadow;
    }
  }

  setCharge(v: number): void {
    this.eyeMat.emissiveIntensity = 1 + v * 3;
    this.eyeMat.emissive.setRGB(1, 0.3 + v * 0.55, 0.18 + v * 0.6);
    this.eyeL.scale.y = 0.055 + v * 0.05;
    this.eyeR.scale.y = 0.055 + v * 0.05;
    const mat = this.ring.material as THREE.MeshBasicMaterial;
    mat.opacity = v * 0.5;
    this.ring.scale.setScalar(0.8 + v * 0.55);
  }

  flash(): void {
    this.flashValue = 1;
  }

  animate(dt: number, timeScale: number): void {
    this.phase += dt * (1.4 + timeScale * 2.5);
    this.group.position.y = this.still ? 0 : Math.sin(this.phase) * 0.012;
    this.flashValue = Math.max(0, this.flashValue - dt * 5);
    this.bodyMat.emissive.setRGB(this.flashValue * 0.9, this.flashValue * 0.55, this.flashValue * 0.2);
    this.bodyMat.emissiveIntensity = this.flashValue * 1.8;
  }
}

export class BossAvatar {
  readonly group = new THREE.Group();
  private armorMat: THREE.MeshStandardMaterial;
  private trimMat: THREE.MeshStandardMaterial;
  private faceMat: THREE.MeshStandardMaterial;
  private eyeMat: THREE.MeshStandardMaterial;
  private hands: THREE.Group;
  private hourHand: THREE.Mesh;
  private minuteHand: THREE.Mesh;
  private orbiters: THREE.Group[] = [];
  private phase = 0;
  private flashValue = 0;

  constructor(accent: number) {
    this.armorMat = new THREE.MeshStandardMaterial({ color: 0x1c1a24, roughness: 0.55, metalness: 0.35 });
    this.trimMat = new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      emissive: 0x6b4e08,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.75,
    });
    this.faceMat = new THREE.MeshStandardMaterial({ color: 0xefe7d3, roughness: 0.5 });
    this.eyeMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.6,
      roughness: 0.3,
    });

    const legL = voxel(0.45, 0.55, 0.5, this.armorMat, -0.38, 0.28, 0);
    const legR = voxel(0.45, 0.55, 0.5, this.armorMat, 0.38, 0.28, 0);
    const skirt = voxel(1.5, 0.35, 1.0, this.trimMat, 0, 0.72, 0);
    const torso = voxel(1.55, 1.1, 1.05, this.armorMat, 0, 1.4, 0);
    const chest = voxel(0.9, 0.5, 0.06, this.trimMat, 0, 1.45, 0.54);
    const shoulderL = voxel(0.6, 0.35, 0.9, this.armorMat, -0.98, 1.9, 0);
    const shoulderR = voxel(0.6, 0.35, 0.9, this.armorMat, 0.98, 1.9, 0);
    const armL = voxel(0.35, 1.0, 0.4, this.armorMat, -1.05, 1.25, 0.05);
    const armR = voxel(0.35, 1.0, 0.4, this.armorMat, 1.05, 1.25, 0.05);
    const neck = voxel(0.45, 0.3, 0.4, this.armorMat, 0, 2.03, 0);
    const head = voxel(1.2, 1.0, 0.95, this.armorMat, 0, 2.6, 0);
    const hat = voxel(1.9, 0.12, 1.4, this.trimMat, 0, 3.14, 0);
    hat.rotation.z = 0.04;
    const hatTop = voxel(0.7, 0.22, 0.55, this.armorMat, 0, 3.28, 0);
    const face = voxel(0.85, 0.72, 0.06, this.faceMat, 0, 2.62, 0.5);
    const faceRim = voxel(0.95, 0.82, 0.03, this.trimMat, 0, 2.62, 0.47);
    const eye = voxel(0.2, 0.2, 0.05, this.eyeMat, 0, 2.86, 0.53);
    const mouth = voxel(0.4, 0.05, 0.04, this.armorMat, 0, 2.42, 0.53);

    this.hands = new THREE.Group();
    this.hands.position.set(0, 2.62, 0.55);
    this.hourHand = voxel(0.055, 0.26, 0.025, this.armorMat, 0, 0.11, 0);
    this.minuteHand = voxel(0.04, 0.36, 0.03, this.eyeMat, 0, 0.16, 0.005);
    const pin = voxel(0.08, 0.08, 0.05, this.trimMat, 0, 0, 0.01);
    this.hands.add(this.hourHand, this.minuteHand, pin);

    for (let i = 0; i < 4; i++) {
      const orb = new THREE.Group();
      const cube = voxel(0.22, 0.22, 0.22, this.trimMat, 0, 0, 0);
      const glow = voxel(0.1, 0.1, 0.1, this.eyeMat, 0, 0, 0);
      orb.add(cube, glow);
      this.group.add(orb);
      this.orbiters.push(orb);
    }

    this.group.add(contactShadow(3.0));
    this.group.add(
      legL,
      legR,
      skirt,
      torso,
      chest,
      shoulderL,
      shoulderR,
      armL,
      armR,
      neck,
      head,
      faceRim,
      face,
      eye,
      mouth,
      hat,
      hatTop,
      this.hands,
    );
  }

  setCharge(v: number): void {
    this.eyeMat.emissiveIntensity = 1.2 + v * 4;
  }

  flash(): void {
    this.flashValue = 1;
  }

  animate(dt: number, timeScale: number): void {
    this.phase += dt * (0.7 + timeScale * 2);
    const now = performance.now() * 0.001;
    this.hourHand.rotation.z = -now * 0.28;
    this.minuteHand.rotation.z = -now * 1.35;
    this.orbiters.forEach((orb, i) => {
      const a = this.phase * 0.7 + (i / this.orbiters.length) * Math.PI * 2;
      orb.position.set(Math.cos(a) * 1.55, 1.8 + Math.sin(a * 2 + i) * 0.25, Math.sin(a) * 1.2);
      orb.rotation.x += dt * 1.2;
      orb.rotation.y += dt * 0.8;
    });
    this.flashValue = Math.max(0, this.flashValue - dt * 4);
    this.armorMat.emissive.setRGB(this.flashValue * 0.7, this.flashValue * 0.12, this.flashValue * 0.08);
    this.group.position.y = Math.sin(this.phase * 0.8) * 0.03;
  }
}

export function makeCoinMesh(): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xf2b51c,
    emissive: 0xf2a11c,
    emissiveIntensity: 0.75,
    roughness: 0.32,
    metalness: 0.55,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), mat);
  mesh.castShadow = true;
  return mesh;
}

export function makeAmmoMesh(): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2b2b31,
    emissive: 0xf2b51c,
    emissiveIntensity: 0.35,
    roughness: 0.5,
    metalness: 0.4,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), mat);
  mesh.castShadow = true;
  return mesh;
}

// Bullets share geometry and materials. There are only a handful of sizes and
// colors, and creating (then disposing) two geometries and two materials per
// shot made every volley re-upload buffers and re-check shaders. These caches
// live for the whole session and are never disposed.
const bulletGeos = new Map<string, THREE.BoxGeometry>();
const bulletCoreMats = new Map<string, THREE.MeshStandardMaterial>();
const bulletTrailMats = new Map<number, THREE.MeshBasicMaterial>();

function bulletGeo(part: 'core' | 'trail', size: number): THREE.BoxGeometry {
  const key = `${part}:${size}`;
  let geo = bulletGeos.get(key);
  if (!geo) {
    geo =
      part === 'core'
        ? new THREE.BoxGeometry(0.1 * size, 0.1 * size, 0.34 * size)
        : new THREE.BoxGeometry(0.045 * size, 0.045 * size, 0.9 * size);
    bulletGeos.set(key, geo);
  }
  return geo;
}

function bulletCoreMat(color: number, emissive: number): THREE.MeshStandardMaterial {
  const key = `${color}:${emissive}`;
  let mat = bulletCoreMats.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 2.4, roughness: 0.3 });
    bulletCoreMats.set(key, mat);
  }
  return mat;
}

function bulletTrailMat(color: number): THREE.MeshBasicMaterial {
  let mat = bulletTrailMats.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    bulletTrailMats.set(color, mat);
  }
  return mat;
}

/**
 * A bullet is a group of two meshes built from shared resources: remove it from
 * the scene when it dies, never dispose its geometry or materials.
 */
export function makeBulletMesh(color: number, trailColor: number, size: number): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(bulletGeo('core', size), bulletCoreMat(color, color));
  group.add(core);
  const trail = new THREE.Mesh(bulletGeo('trail', size), bulletTrailMat(trailColor));
  trail.position.z = -0.42 * size;
  group.add(trail);
  return group;
}

/** Recolors one bullet by switching it to other shared materials (never edits them). */
export function recolorBulletMesh(group: THREE.Group, color: number, emissive: number, trailColor: number): void {
  const [core, trail] = group.children as THREE.Mesh[];
  if (core) core.material = bulletCoreMat(color, emissive);
  if (trail) trail.material = bulletTrailMat(trailColor);
}

/** Subtle paper-like grid used on the table around the arena. */
export function makeGridTexture(line: string, bg: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, size, size);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
