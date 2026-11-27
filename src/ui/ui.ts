import {
  ACTS,
  LEVELS,
  LevelDef,
} from '../game/levels';
import {
  PACKS,
  SKINS,
  THEMES,
  TRAILS,
  UPGRADES,
  type CosmeticDef,
  type CoinPack,
  findItem,
  findPack,
  findSkin,
  findTheme,
  findTrail,
  REVIVE_COST,
  REVIVE_COST_STEP,
  SkinDef,
} from '../game/catalog';
import type { SaveData } from '../game/save';
import { DIFFICULTIES, DIFFICULTY_ORDER, getDifficulty, type Difficulty } from '../game/difficulty';
import type { HudState, LevelInfo } from '../game/game';
import { formatBRL } from '../game/payments';
import * as THREE from 'three';
import { PlayerAvatar } from '../game/voxel';

export type ShopTab = 'personagens' | 'temas' | 'rastros' | 'melhorias' | 'moedas';

export interface DeathView {
  level: LevelDef;
  kills: number;
  time: number;
  reviveCost: number;
}

export interface WinView {
  level: LevelDef;
  stars: number;
  time: number;
  fragments: number;
  fragmentsTotal: number;
  coinsEarned: number;
  firstClear: boolean;
  nextIndex: number | null;
  newlyUnlocked: LevelDef | null;
  allDone: boolean;
}

export interface UIActions {
  play: () => void;
  menu: () => void;
  selectLevel: (index: number) => void;
  begin: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  quitToMenu: () => void;
  nextLevel: () => void;
  retry: () => void;
  revive: () => void;
  reviveShop: () => void;
  buyItem: (id: string) => boolean;
  equipItem: (id: string) => boolean;
  confirmPack: (id: string) => Promise<{ ok: boolean; pending?: boolean; error?: string }>;
  toggleMute: () => void;
  closeShop: () => void;
  touchMove: (x: number, z: number) => void;
  touchAim: (x: number, z: number, fire: boolean) => void;
  touchFire: (on: boolean) => void;
  touchSlash: () => void;
  touchParry: () => void;
  touchDash: () => void;
  touchSpecial: () => void;
  online: () => void;
  fullscreen: () => void;
}

const coin = '<i class="coin-glyph"></i>';

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function fmtCoins(n: number): string {
  return Math.max(0, Math.round(n)).toLocaleString('pt-BR');
}

function breaks(s: string): string {
  return s.replace(/\n/g, '<br>');
}

function starsRow(n: number): string {
  return `<span class="stars">${[0, 1, 2].map((i) => `<i class="star ${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
}

const ICONS = {
  sound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7"/><path d="M19 6a8 8 0 010 12"/></svg>`,
  mute: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="10" width="16" height="11"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="#111114" stroke-width="3" stroke-linecap="square"><path d="M4 13l5 5L20 6"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>`,
  dash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="M3 7h9M3 12h7M3 17h9M14 7l7 5-7 5"/></svg>`,
  ammo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="3" width="4" height="14"/><path d="M7 17h4v4H7zM15 8h3v9h-3z"/></svg>`,
  parry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19L17 7l2-4 1 1 1 1-4 2L7 19H5z"/><path d="M4 21h6"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5"/></svg>`,
};

function upgradeIcon(name: string): string {
  if (name === 'shield') return ICONS.shield;
  if (name === 'dash') return ICONS.dash;
  if (name === 'ammo') return ICONS.ammo;
  return ICONS.parry;
}

const skinThumbCache = new Map<string, string>();
let thumbRenderer: THREE.WebGLRenderer | null = null;

/**
 * The roster used to show a tiny CSS mosaic. Render the actual voxel ronin
 * once per skin instead, lit like the game, so the shop looks like the game.
 */
function skinThumb(skin: SkinDef): string {
  const cached = skinThumbCache.get(skin.id);
  if (cached) return cached;
  try {
    if (!thumbRenderer) {
      const canvas = document.createElement('canvas');
      thumbRenderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      thumbRenderer.setPixelRatio(1);
      thumbRenderer.setSize(512, 512, false);
      thumbRenderer.outputColorSpace = THREE.SRGBColorSpace;
      thumbRenderer.toneMapping = THREE.NeutralToneMapping;
      thumbRenderer.toneMappingExposure = 1.16;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 24);
    camera.position.set(2.8, 1.68, 4.9);
    camera.lookAt(0, 0.86, 0);

    scene.add(new THREE.HemisphereLight(0xfff7ea, 0x423a32, 1.3));
    scene.add(new THREE.AmbientLight(0xfff2de, 0.18));
    const key = new THREE.DirectionalLight(0xfff1d4, 3.2);
    key.position.set(-3.2, 5.2, 4.0);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff6e8, 1.45);
    fill.position.set(3.6, 2.4, 5.6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x9cc3d6, 1.7);
    rim.position.set(-4.2, 3.2, -4.4);
    scene.add(rim);
    const warm = new THREE.PointLight(skin.accent, 3.0, 8, 2);
    warm.position.set(1.8, 1.2, 2.4);
    scene.add(warm);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.64, 56),
      new THREE.MeshBasicMaterial({
        color: skin.accent,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        forceSinglePass: true, // flat ring: one pass draws both faces
        toneMapped: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    scene.add(ring);

    const avatar = new PlayerAvatar(skin);
    avatar.group.scale.setScalar(1.98);
    avatar.group.rotation.y = 0.42;
    avatar.group.position.y = 0.0;
    avatar.animate(0.016, false, 0.2);
    scene.add(avatar.group);

    thumbRenderer.render(scene, camera);
    const url = thumbRenderer.domElement.toDataURL('image/png');
    skinThumbCache.set(skin.id, url);
    scene.remove(avatar.group, ring);
    return url;
  } catch {
    return '';
  }
}

function skinPreview(skin: SkinDef): string {
  const url = skinThumb(skin);
  if (url) {
    return `<div class="pv-skin-shot"><img src="${url}" alt="${skin.name}" draggable="false" /></div>`;
  }
  return `<div class="pv-skin" style="--pv-body:${skin.cssBody};--pv-accent:${skin.cssAccent};--pv-weapon:${skin.cssWeapon}">
    <i class="pv-shadow"></i>
    <i class="pv-kasa"></i><i class="pv-kasa-top"></i>
    <i class="pv-head"></i><i class="pv-visor"></i>
    <i class="pv-torso"></i><i class="pv-stripe"></i>
    <i class="pv-arm"></i><i class="pv-gun"></i>
    <i class="pv-leg l"></i><i class="pv-leg r"></i>
  </div>`;
}

function themePreview(themeId: string): string {
  const theme = findTheme(themeId);
  const c = theme.css;
  const colors = [c.floor, c.floor2, c.floor, c.wall, c.floor2, c.floor, c.accent, c.floor2];
  return `<div class="pv-theme">${colors.map((col) => `<i style="background:${col}"></i>`).join('')}</div>`;
}

function trailPreview(trailId: string): string {
  const trail = findTrail(trailId);
  return `<div class="pv-trail" style="--pv-trail:${trail.css}"><i></i><i></i><i></i><i></i></div>`;
}

function itemPreview(item: CosmeticDef): string {
  if (item.type === 'skin') return skinPreview(item);
  if (item.type === 'theme') return themePreview(item.id);
  if (item.type === 'trail') return trailPreview(item.id);
  return `<div class="pv-upgrade">${upgradeIcon(item.icon)}</div>`;
}

function packPreview(pack: CoinPack): string {
  if (pack.id === 'pack-founder') {
    return `<div class="pv-founder"><div class="crown"></div><div class="pv-coins"><i class="c"></i><i class="c"></i><i class="c"></i><i class="c"></i><i class="c"></i></div></div>`;
  }
  return `<div class="pv-coins"><i class="c"></i><i class="c"></i><i class="c"></i><i class="c"></i><i class="c"></i></div>`;
}

function iconButton(action: string, icon: string, label: string): string {
  return `<button class="icon-btn" data-action="${action}" aria-label="${label}" title="${label}">${icon}</button>`;
}

/**
 * Moves the crosshair with a transform (composited) instead of left/top, which
 * re-ran layout and its drop-shadow filter on every mouse move.
 */
export function placeCrosshair(el: HTMLElement, x: number, y: number): void {
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

export class UI {
  private root: HTMLElement;
  private getSave: () => SaveData;
  private actions: UIActions;
  private active = '';
  private tab: ShopTab = 'personagens';
  private modal!: HTMLElement;
  private crosshair!: HTMLElement;
  private vignette!: HTMLElement;
  private hitFlash!: HTMLElement;
  private specialFlash!: HTMLElement;
  private touchUi!: HTMLElement;
  private touchIai!: HTMLElement;
  private touchAimId = -1;
  private touchMoveId = -1;
  private toasts!: HTMLElement;
  private currentPackId: string | null = null;
  private afterModalRefresh = false;
  private hudRefs: Record<string, HTMLElement> = {};
  private hudBuilt = false;
  private lastHudKey = '';
  private lastDeathView: DeathView | null = null;
  private lastWinView: WinView | null = null;

  constructor(root: HTMLElement, getSave: () => SaveData, actions: UIActions) {
    this.root = root;
    this.getSave = getSave;
    this.actions = actions;
    this.root.innerHTML = `
      <div class="screen menu-screen" data-screen="menu"></div>
      <div class="screen" data-screen="levels"></div>
      <div class="screen" data-screen="roster"></div>
      <div class="screen shop-screen" data-screen="shop"></div>
      <div class="screen briefing" data-screen="briefing"></div>
      <div class="screen hud-screen" data-screen="hud"></div>
      <div class="screen overlay-screen" data-screen="pause"></div>
      <div class="screen overlay-screen" data-screen="death"></div>
      <div class="screen overlay-screen" data-screen="win"></div>
      <div class="modal" id="modal"></div>
      <div class="toast-wrap"></div>
      <div class="time-vignette"></div>
      <div class="flash-red"></div>
      <div class="flash-special"></div>
      <div class="crosshair" id="crosshair"><span class="ring"></span><span class="dot"></span></div>
      <div class="touch-ui" id="touch-ui">
        <div class="touch-stick" id="touch-stick">
          <div class="stick-base"><i class="stick-knob"></i></div>
          <span class="stick-label">Mover</span>
        </div>
        <div class="touch-aim" id="touch-aim">
          <div class="aim-stick"><i class="aim-knob"></i></div>
          <span class="aim-hint">Arraste para mirar e atirar</span>
        </div>
        <div class="touch-actions">
          <button class="touch-btn t-dash" data-touch="dash" aria-label="Dash">Dash</button>
          <button class="touch-btn t-iai" data-touch="special" aria-label="Iai">Iai</button>
          <button class="touch-btn t-slash" data-touch="slash" aria-label="Cortar">Cortar</button>
          <button class="touch-btn t-parry" data-touch="parry" aria-label="Aparar">Aparo</button>
          <button class="touch-btn t-fullscreen" data-touch="fullscreen" aria-label="Tela cheia">${ICONS.fullscreen}</button>
        </div>
      </div>
      <div class="desktop-note" id="desktop-note">
        <h3>Melhor com teclado</h3>
        <p>MOVESTOP foi desenhado para WASD + mouse. Em telas pequenas a experiência de mira fica limitada.</p>
        <button class="btn wide" data-action="desktop-ok">Entendi, continuar</button>
      </div>
    `;
    this.modal = this.root.querySelector('#modal') as HTMLElement;
    this.crosshair = this.root.querySelector('#crosshair') as HTMLElement;
    this.vignette = this.root.querySelector('.time-vignette') as HTMLElement;
    this.hitFlash = this.root.querySelector('.flash-red') as HTMLElement;
    this.specialFlash = this.root.querySelector('.flash-special') as HTMLElement;
    this.touchUi = this.root.querySelector('#touch-ui') as HTMLElement;
    this.touchIai = this.root.querySelector('.t-iai') as HTMLElement;
    this.toasts = this.root.querySelector('.toast-wrap') as HTMLElement;

    this.bind();
    this.buildHud();
  }

  private bind(): void {
    this.root.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      if (!action) return;
      this.handle(action, target);
    });

    window.addEventListener('pointermove', (e) => {
      if (this.active !== 'hud') return;
      placeCrosshair(this.crosshair, e.clientX, e.clientY);
    });
    window.addEventListener('pointerdown', (e) => {
      if (this.active !== 'hud') return;
      this.crosshair.classList.remove('shoot', 'parry');
      this.crosshair.classList.add(e.button === 0 ? 'shoot' : 'parry');
      window.setTimeout(() => this.crosshair.classList.remove('shoot', 'parry'), 150);
    });

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const touch = coarse || (window.innerWidth < 900 && navigator.maxTouchPoints > 0);
    document.body.classList.toggle('touch', touch);
    if (touch) this.bindTouch();
  }

  private handle(action: string, el: HTMLElement): void {
    const id = el.dataset.id ?? '';
    switch (action) {
      case 'play':
        this.actions.play();
        break;
      case 'online':
        this.actions.online();
        break;
      case 'fullscreen':
        this.actions.fullscreen();
        break;
      case 'menu':
        this.actions.quitToMenu();
        break;
      case 'levels':
        this.showLevels();
        break;
      case 'roster':
        this.showRoster();
        break;
      case 'shop':
        this.showShop('personagens');
        break;
      case 'shop-tab':
        this.showShop((el.dataset.tab as ShopTab) ?? 'personagens');
        break;
      case 'level':
        this.actions.selectLevel(Number(el.dataset.index));
        break;
      case 'begin':
        this.actions.begin();
        break;
      case 'difficulty':
        if (el.dataset.difficulty === 'easy' || el.dataset.difficulty === 'hard' || el.dataset.difficulty === 'impossible') {
          this.actions.setDifficulty(el.dataset.difficulty);
        }
        break;
      case 'pause':
        this.actions.pause();
        break;
      case 'resume':
        this.actions.resume();
        break;
      case 'restart':
        this.actions.restart();
        break;
      case 'quit':
        this.actions.quitToMenu();
        break;
      case 'retry':
        this.actions.retry();
        break;
      case 'next':
        this.actions.nextLevel();
        break;
      case 'revive':
        this.actions.revive();
        break;
      case 'revive-shop':
        this.actions.reviveShop();
        break;
      case 'item':
        this.openItemModal(id);
        break;
      case 'equip':
        if (this.actions.equipItem(id)) {
          this.toast('Personagem equipado', false);
          this.refreshCurrent();
        }
        break;
      case 'confirm-item': {
        if (this.actions.buyItem(id)) {
          this.closeModal();
          this.toast('Item desbloqueado', true);
          this.refreshCurrent();
        }
        break;
      }
      case 'go-packs':
        this.closeModal();
        this.showShop('moedas');
        break;
      case 'buy-pack':
        this.openCheckout(id);
        break;
      case 'confirm-pack':
        void this.confirmCheckout();
        break;
      case 'method': {
        const buttons = this.modal.querySelectorAll('.method');
        buttons.forEach((b) => b.classList.remove('active'));
        el.classList.add('active');
        break;
      }
      case 'close-modal':
        this.closeModal();
        break;
      case 'close-shop':
        this.actions.closeShop();
        break;
      case 'mute':
        this.actions.toggleMute();
        break;
      case 'desktop-ok':
        (this.root.querySelector('#desktop-note') as HTMLElement).classList.remove('active');
        break;
      case 'noop':
        break;
      default:
        break;
    }
  }

  private resetTouch(): void {
    this.actions.touchMove(0, 0);
    this.actions.touchFire(false);
    this.touchMoveId = -1;
    this.touchAimId = -1;
    this.root.querySelectorAll('.touch-stick, .touch-aim').forEach((el) => el.classList.remove('active', 'aiming'));
    this.root.querySelectorAll('.touch-btn').forEach((el) => el.classList.remove('pressed'));
  }

  private bindTouch(): void {
    const stick = this.root.querySelector('#touch-stick') as HTMLElement;
    const knob = this.root.querySelector('.stick-knob') as HTMLElement;
    if (stick && knob) {
      let center = { x: 0, y: 0 };
      let radius = 40;
      const base = stick.querySelector('.stick-base') as HTMLElement;
      const update = (e: PointerEvent) => {
        const dx = e.clientX - center.x;
        const dy = e.clientY - center.y;
        const len = Math.hypot(dx, dy);
        const k = len > 0 ? Math.min(1, len / radius) : 0;
        const nx = len > 0 ? dx / len : 0;
        const ny = len > 0 ? dy / len : 0;
        knob.style.transform = `translate(${nx * radius * k}px, ${ny * radius * k}px)`;
        this.actions.touchMove(nx * k, ny * k);
      };
      stick.addEventListener('pointerdown', (e) => {
        if (this.touchMoveId !== -1) return;
        e.preventDefault();
        e.stopPropagation();
        this.touchMoveId = e.pointerId;
        stick.setPointerCapture(e.pointerId);
        const rect = (base ?? stick).getBoundingClientRect();
        center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        radius = rect.width * 0.32;
        stick.classList.add('active');
        update(e);
      });
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.touchMoveId) return;
        update(e);
      });
      const end = (e: PointerEvent) => {
        if (e.pointerId !== this.touchMoveId) return;
        this.touchMoveId = -1;
        knob.style.transform = 'translate(0px, 0px)';
        stick.classList.remove('active');
        this.actions.touchMove(0, 0);
      };
      stick.addEventListener('pointerup', end);
      stick.addEventListener('pointercancel', end);
    }

    const aim = this.root.querySelector('#touch-aim') as HTMLElement;
    const aimRing = this.root.querySelector('.aim-stick') as HTMLElement;
    if (aim && aimRing) {
      let origin = { x: 0, y: 0 };
      const moveRing = (dx: number, dy: number) => {
        const len = Math.hypot(dx, dy);
        const k = len > 0 ? Math.min(1, len / 52) : 0;
        const nx = len > 0 ? dx / len : 0;
        const ny = len > 0 ? dy / len : 0;
        aimRing.style.left = `${origin.x}px`;
        aimRing.style.top = `${origin.y}px`;
        aimRing.querySelector('i')!.style.transform = `translate(${nx * 32 * k}px, ${ny * 32 * k}px)`;
      };
      aim.addEventListener('pointerdown', (e) => {
        if (this.touchAimId !== -1) return;
        e.preventDefault();
        e.stopPropagation();
        this.touchAimId = e.pointerId;
        aim.setPointerCapture(e.pointerId);
        origin = { x: e.clientX, y: e.clientY };
        aim.classList.add('aiming', 'used');
        moveRing(0, 0);
        // a tap aims from the centre of the action, then dragging refines it
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.62;
        let dx = (e.clientX - cx) / (window.innerWidth * 0.3);
        let dy = (e.clientY - cy) / (window.innerHeight * 0.3);
        const len = Math.hypot(dx, dy);
        if (len < 0.22) {
          dx = 0;
          dy = -1;
        } else {
          dx /= len;
          dy /= len;
        }
        this.actions.touchAim(dx, dy, true);
        this.actions.touchFire(true);
      });
      aim.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.touchAimId) return;
        const dx = e.clientX - origin.x;
        const dy = e.clientY - origin.y;
        moveRing(dx, dy);
        if (Math.hypot(dx, dy) > 7) {
          const len = Math.hypot(dx, dy);
          this.actions.touchAim(dx / len, dy / len, true);
        }
      });
      const end = (e: PointerEvent) => {
        if (e.pointerId !== this.touchAimId) return;
        this.touchAimId = -1;
        aim.classList.remove('aiming');
        this.actions.touchFire(false);
      };
      aim.addEventListener('pointerup', end);
      aim.addEventListener('pointercancel', end);
    }

    this.root.querySelectorAll<HTMLElement>('.touch-btn').forEach((btn) => {
      const action = btn.dataset.touch;
      const fire = () => {
        if (action === 'slash') this.actions.touchSlash();
        else if (action === 'parry') this.actions.touchParry();
        else if (action === 'dash') this.actions.touchDash();
        else if (action === 'special') this.actions.touchSpecial();
        else if (action === 'fullscreen') this.actions.fullscreen();
      };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');
        btn.setPointerCapture(e.pointerId);
        try {
          navigator.vibrate?.(action === 'special' ? 28 : 9);
        } catch {
          /* haptics are a bonus, never a requirement */
        }
        fire();
      });
      const release = () => btn.classList.remove('pressed');
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    });
  }

  private refreshCurrent(): void {
    if (this.active === 'shop') this.showShop(this.tab);
    else if (this.active === 'roster') this.showRoster();
    else if (this.active === 'levels') this.showLevels();
    else if (this.active === 'menu') this.showMenu();
  }

  private screen(name: string): HTMLElement {
    return this.root.querySelector(`[data-screen="${name}"]`) as HTMLElement;
  }

  private activate(name: string): void {
    if (name !== 'hud') this.resetTouch();
    this.active = name;
    this.root.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const target = this.screen(name);
    if (target) target.classList.add('active');
    document.body.classList.toggle('playing', name === 'hud');
    this.crosshair.classList.toggle('active', name === 'hud');
    if (name !== 'hud') this.vignette.classList.remove('on');
  }

  private topbar(showBack = false): string {
    const save = this.getSave();
    return `<header class="topbar">
      <div class="topbar-left">
        <span class="brand-chip"><i class="sq"></i>MOVESTOP</span>
        <span class="version-chip">Protótipo · 0.1</span>
      </div>
      <div class="topbar-right">
        ${showBack ? `<button class="btn ghost sm" data-action="menu">← Menu</button>` : ''}
        <button class="coin-pill" data-action="shop" aria-label="Abrir loja">${coin}<span class="js-coins">${fmtCoins(save.coins)}</span></button>
        ${iconButton('mute', save.muted ? ICONS.mute : ICONS.sound, 'Som')}
      </div>
    </header>`;
  }

  private nextLevel(save: SaveData): LevelDef {
    for (let i = 0; i < Math.max(1, save.unlocked); i++) {
      const l = LEVELS[i];
      if (!l) break;
      if (!(save.stars[l.id] > 0)) return l;
    }
    return LEVELS[Math.min(Math.max(1, save.unlocked) - 1, LEVELS.length - 1)];
  }

  showMenu(): void {
    const save = this.getSave();
    const difficulty = getDifficulty(save.difficulty);
    const next = this.nextLevel(save);
    const nextIdx = LEVELS.findIndex((l) => l.id === next.id);
    const cleared = Object.values(save.stars).filter((s) => s > 0).length;
    const el = this.screen('menu');
    el.innerHTML = `
      ${this.topbar()}
      <main class="menu-hero">
        <p class="eyebrow"><span class="seal" aria-hidden="true">止</span> Um duelo contra o tempo</p>
        <h1 class="game-title" aria-label="Movestop"><span class="line">MOVE</span><span class="line line-2">STOP</span></h1>
        <div class="title-meta">
          <p class="tagline">O tempo só anda <b>quando você anda.</b></p>
        </div>
        <nav class="menu-actions" aria-label="Menu principal">
          <button class="btn lg" data-action="play">${cleared > 0 ? 'Continuar' : 'Jogar'} <span class="arr">→</span></button>
          <button class="btn ghost" data-action="online">Duelo online <span class="beta">beta</span></button>
          <button class="btn ghost" data-action="levels">Campanha</button>
          <button class="btn ghost" data-action="roster">Personagens</button>
        </nav>
        <div class="next-line">
          <span class="next-chip">Fase ${String(next.id).padStart(2, '0')}</span>
          <strong>${next.name.replace(/\n/g, ' ')}</strong>
          <span class="next-sub">${cleared}/8 concluídas · ${difficulty.label}</span>
        </div>
      </main>
      <footer class="menu-footer">
        <div class="controls-mini">
          <span class="hint-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> mover</span>
          <span class="hint-row"><kbd>clique</kbd> atirar</span>
          <span class="hint-row"><kbd>F</kbd> cortar</span>
          <span class="hint-row"><kbd>dir.</kbd> aparar</span>
          <span class="hint-row"><kbd>shift</kbd> dash</span>
          <span class="hint-row"><kbd>R</kbd> iai</span>
        </div>
        <div class="meta">Uma campanha em três atos</div>
      </footer>
    `;
    this.activate('menu');
    void nextIdx;
  }

  showLevels(): void {
    const save = this.getSave();
    const next = this.nextLevel(save);
    let cards = '';
    for (const act of ACTS) {
      const levels = LEVELS.filter((l) => l.act === act.id);
      cards += `<section class="act-block">
        <div class="act-label"><span>${act.name}</span><em>${act.subtitle}</em></div>
        <div class="levels-grid">${levels
          .map((level) => {
            const idx = LEVELS.indexOf(level);
            const locked = idx >= save.unlocked;
            const stars = save.stars[level.id] ?? 0;
            const best = save.best[level.id];
            return `<button class="level-card ${locked ? 'locked' : ''} ${next.id === level.id ? 'next' : ''}" data-action="level" data-index="${idx}" ${locked ? 'disabled' : ''}>
              ${next.id === level.id ? '<span class="card-flag">Próxima</span>' : ''}
              <div class="card-top">
                <span class="num">${String(level.id).padStart(2, '0')}</span>
                <span class="status">${locked ? 'Bloqueada' : stars > 0 ? 'Concluída' : 'Aberta'}</span>
              </div>
              <div class="card-body">
                <h3 class="name">${breaks(level.name)}</h3>
                <p class="desc">${level.subtitle}</p>
                <div class="card-foot">
                  <div>${starsRow(stars)}</div>
                  <span class="best">${best ? `Melhor ${fmtTime(best)}` : 'Sem recorde'}</span>
                  <span class="go">${locked ? '—' : 'Jogar →'}</span>
                </div>
              </div>
              ${locked ? `<span class="lock-badge">${ICONS.lock}</span>` : ''}
            </button>`;
          })
          .join('')}</div>
      </section>`;
    }
    const el = this.screen('levels');
    el.innerHTML = `
      ${this.topbar(true)}
      <div class="page-head">
        <div>
          <h1 class="page-title">Fases <em>da campanha</em></h1>
          <p class="page-sub">Três atos. Oito encontros. Uma regra: o tempo obedece ao seu movimento.</p>
        </div>
        <div class="page-actions">
          <button class="btn ghost sm" data-action="roster">Personagens</button>
          <button class="btn sm" data-action="shop">Arsenal</button>
        </div>
      </div>
      <div class="scroll-area">
        ${cards}
        <div class="levels-side">
          <p class="side-note">As 3 estrelas dependem do tempo: complete dentro do par, sem correr. Morrer não apaga seu melhor tempo.</p>
          <div class="controls-mini">
            <span class="hint-row"><kbd>WASD</kbd> mover</span>
            <span class="hint-row"><kbd>clique</kbd> atirar</span>
            <span class="hint-row"><kbd>F</kbd> cortar</span>
            <span class="hint-row"><kbd>dir.</kbd> aparar</span>
            <span class="hint-row"><kbd>shift</kbd> dash</span>
            <span class="hint-row"><kbd>R</kbd> iai</span>
          </div>
        </div>
      </div>
    `;
    this.activate('levels');
  }

  showRoster(): void {
    const save = this.getSave();
    const cards = SKINS.map((skin) => {
      const owned = save.owned.includes(skin.id);
      const equipped = save.skin === skin.id;
      let action = 'item';
      let target = skin.id;
      let label = `Comprar ${coin}${fmtCoins(skin.price)}`;
      let disabled = false;
      if (equipped) {
        action = 'noop';
        label = 'Equipado';
        disabled = true;
      } else if (owned) {
        action = 'equip';
        label = 'Equipar';
      } else if (skin.price === 0) {
        action = 'buy-pack';
        target = 'pack-founder';
        label = 'Founder Pack';
      }
      return `<article class="shop-card char-card ${equipped ? 'equipped' : ''}">
        ${skin.tag ? `<span class="tag ${skin.tag === 'FOUNDER' ? 'gold' : 'hot'}">${skin.tag}</span>` : ''}
        <div class="preview char-preview">${skinPreview(skin)}</div>
        <div class="info">
          <div class="char-head"><h3 class="s-name">${skin.name}</h3><span class="char-seal" aria-hidden="true">止</span><span class="perk-tag">${skin.perkName}</span></div>
          <p class="perk-desc">${skin.perkDesc}</p>
          <p class="s-desc">${skin.desc}</p>
          <button class="buy ${equipped ? 'owned' : ''}" data-action="${action}" data-id="${target}" ${disabled ? 'disabled' : ''}>${label}</button>
        </div>
      </article>`;
    }).join('');
    const el = this.screen('roster');
    el.innerHTML = `
      ${this.topbar(true)}
      <div class="page-head">
        <div>
          <h1 class="page-title">Personagens <em>do ronin</em></h1>
          <p class="page-sub">Cinco ronins, cinco formas de parar o tempo. Todos desbloqueáveis jogando.</p>
        </div>
        <div class="page-actions">
          <button class="btn sm" data-action="shop">Arsenal</button>
        </div>
      </div>
      <div class="scroll-area">
        <div class="shop-grid roster-grid">${cards}</div>
        <div class="roster-quote">
          <span class="rq-mark" aria-hidden="true">止</span>
          <p>“O tempo não é seu inimigo. É o seu ritmo.”</p>
          <small>Cinco posturas. Um único instante. Todos desbloqueáveis jogando.</small>
        </div>
        <div class="shop-note">Perks valem a partir da próxima fase iniciada. Nenhum personagem é exclusivo de dinheiro real — o DAIMYO vem no Founder Pack como bônus cosmético.</div>
      </div>
    `;
    this.activate('roster');
  }

  showShop(tab: ShopTab = 'personagens'): void {
    this.tab = tab;
    const save = this.getSave();
    const tabs: { id: ShopTab; label: string }[] = [
      { id: 'personagens', label: 'Personagens' },
      { id: 'temas', label: 'Temas' },
      { id: 'rastros', label: 'Rastros' },
      { id: 'melhorias', label: 'Melhorias' },
      { id: 'moedas', label: 'Moedas' },
    ];
    const tabHtml = tabs
      .map(
        (t) =>
          `<button class="shop-tab ${this.tab === t.id ? 'active' : ''}" data-action="shop-tab" data-tab="${t.id}"><span class="tab-dot"></span>${t.label}</button>`,
      )
      .join('');

    let content = '';
    if (tab === 'moedas') {
      content = `<div class="founder-banner">
          <div>
            <div class="fb-kicker">Founder Pack · edição limitada</div>
            <h3>Vista-se de ouro.<br>E de neon.</h3>
            <p>1500 moedas + personagem DAIMYO + tema NEON + rastro PLASMA. Um agradecimento a quem financiou o protótipo.</p>
          </div>
          <div class="fb-side">
            <div class="fb-price">${formatBRL(1990)}<small>Pagamento único</small></div>
            <button class="btn gold" data-action="buy-pack" data-id="pack-founder">Ver pacote</button>
          </div>
        </div>
        <div class="shop-grid">${PACKS.map((p) => this.packCard(p)).join('')}</div>
        <p class="shop-note"><b>Checkout de demonstração.</b> Nenhum valor é cobrado neste protótipo. Em produção, o botão abre um checkout hospedado (Stripe/Paddle) e a liberação é verificada por webhook — o cliente nunca decide sozinho que pagou.</p>`;
    } else {
      const items = tab === 'personagens' ? SKINS : tab === 'temas' ? THEMES : tab === 'rastros' ? TRAILS : UPGRADES;
      content = `<div class="shop-grid">${items.map((item) => this.itemCard(item)).join('')}</div>
        <p class="shop-note">Moedas são ganhas jogando: 120–600 por fase + 15 por fragmento. Nada aqui é pay-to-win: perks são alternativas, não upgrades infinitos.</p>`;
    }

    const el = this.screen('shop');
    el.innerHTML = `
      <header class="topbar shop-head">
        <div class="topbar-left">
          <button class="btn ghost sm" data-action="close-shop">← Voltar</button>
          <span class="brand-chip"><i class="sq"></i>Loja</span>
        </div>
        <div class="topbar-right">
          <span class="shop-balance">${coin}<span class="js-coins">${fmtCoins(save.coins)}</span></span>
          ${iconButton('mute', save.muted ? ICONS.mute : ICONS.sound, 'Som')}
        </div>
      </header>
      <div class="page-head" style="margin-top:14px">
        <div>
          <h1 class="page-title">Arsenal <em>do ronin</em></h1>
          <p class="page-sub">Aparências, perks e moedas. Fragmentos são ganhos em campo.</p>
        </div>
      </div>
      <div class="shop-tabs">${tabHtml}</div>
      <div class="scroll-area">${content}</div>
    `;
    this.activate('shop');
  }

  private itemCard(item: CosmeticDef): string {
    const save = this.getSave();
    const owned = save.owned.includes(item.id);
    const equipped =
      (item.type === 'skin' && save.skin === item.id) ||
      (item.type === 'theme' && save.theme === item.id) ||
      (item.type === 'trail' && save.trail === item.id);
    let action = 'item';
    let target = item.id;
    let label = `Comprar ${coin}${fmtCoins(item.price)}`;
    let disabled = false;
    if (owned) {
      if (item.type === 'upgrade') {
        action = 'noop';
        label = 'Ativo';
        disabled = true;
      } else if (equipped) {
        action = 'noop';
        label = 'Equipado';
        disabled = true;
      } else {
        action = 'equip';
        label = 'Equipar';
      }
    } else if (item.price === 0) {
      action = 'buy-pack';
      target = 'pack-founder';
      label = 'Founder Pack';
    }
    const perk =
      item.type === 'skin'
        ? `<p class="perk-line"><b>${item.perkName}</b> · ${item.perkDesc}</p>`
        : '';
    return `<article class="shop-card ${item.type === 'skin' ? 'skin-card' : ''} ${equipped ? 'equipped' : ''}">
      ${item.tag ? `<span class="tag ${item.tag === 'NOVO' ? 'hot' : ''}">${item.tag}</span>` : ''}
      <div class="preview">${itemPreview(item)}</div>
      <div class="info">
        <div class="shop-name-row"><h3 class="s-name">${item.name}</h3>${item.type === 'skin' ? '<span class="char-seal" aria-hidden="true">止</span>' : ''}</div>
        ${perk}
        <p class="s-desc">${item.desc}</p>
        <button class="buy ${equipped ? 'owned' : ''}" data-action="${action}" data-id="${target}" ${disabled ? 'disabled' : ''}>${label}</button>
      </div>
    </article>`;
  }

  private packCard(pack: CoinPack): string {
    return `<article class="shop-card pack-card ${pack.best ? 'best' : ''}">
      ${pack.tag ? `<span class="tag ${pack.tag === 'LIMITADO' ? 'hot' : pack.best ? 'gold' : ''}">${pack.tag}</span>` : ''}
      <div class="preview">
        ${packPreview(pack)}
        <span class="pack-amount">${coin}${fmtCoins(pack.coins)}</span>
      </div>
      <div class="info">
        <h3 class="s-name">${pack.name} ${pack.bonus ? `<span class="bonus">${pack.bonus}</span>` : ''}</h3>
        <p class="s-desc">${pack.desc}</p>
        <button class="buy" data-action="buy-pack" data-id="${pack.id}">${formatBRL(pack.priceCents)}</button>
      </div>
    </article>`;
  }

  showBriefing(info: LevelInfo): void {
    const level = info.level;
    const difficulty = getDifficulty(this.getSave().difficulty);
    const difficultyOptions = DIFFICULTY_ORDER.map((id) => {
      const def = DIFFICULTIES[id];
      return `<button class="difficulty-btn ${id === difficulty.id ? 'is-active' : ''}" type="button" data-action="difficulty" data-difficulty="${id}" aria-pressed="${id === difficulty.id}">
        <b>${def.label}</b><span>${def.short}</span>
      </button>`;
    }).join('');
    const el = this.screen('briefing');
    el.innerHTML = `<div class="briefing-card">
      <div class="brief-scroll">
        <div class="kicker">Fase ${String(level.id).padStart(2, '0')} · ${ACTS.find((a) => a.id === level.act)?.name ?? ''}</div>
        <h2>${breaks(level.name)}</h2>
        <p class="sub">${level.subtitle}</p>
        <div class="brief-grid">
          <div><span class="k">Munição</span><span class="v ${info.ammo === 0 ? 'red' : ''}">${info.ammo === 0 ? 'Sem balas' : `${info.ammo} balas`}</span></div>
          <div><span class="k">Vida</span><span class="v">${info.maxHp}</span></div>
          <div><span class="k">Ondas</span><span class="v">${info.waves}</span></div>
        </div>
        <div class="difficulty-picker" role="group" aria-label="Dificuldade">
          <div class="difficulty-head"><span class="k">Dificuldade</span><em>${difficulty.description}</em></div>
          <div class="difficulty-options">${difficultyOptions}</div>
        </div>
        <div class="brief-char"><span>Personagem</span><b>${info.character.name}</b><em>${info.character.perkDesc}</em></div>
        <div class="brief-controls">
          <span class="hint-row"><kbd>WASD</kbd> mover = tempo anda</span>
          <span class="hint-row"><kbd>clique</kbd> atirar</span>
          <span class="hint-row"><kbd>F</kbd> cortar</span>
          <span class="hint-row"><kbd>dir.</kbd> aparar</span>
          <span class="hint-row"><kbd>shift</kbd> dash</span>
          <span class="hint-row"><kbd>R</kbd> iai</span>
        </div>
        <div class="brief-touch">
          <span><b>Mover</b> joystick esquerdo</span>
          <span><b>Mirar e atirar</b> arraste na direita</span>
          <span><b>Ações</b> Cortar · Aparo · Dash · Iai</span>
        </div>
        <p class="brief-hint">${level.hint}</p>
      </div>
      <div class="brief-actions">
        <button class="btn ghost sm brief-fullscreen" type="button" data-action="fullscreen">Tela cheia · jogar deitado</button>
        <button class="btn lg" data-action="begin">Entrar <span class="arr">→</span></button>
      </div>
    </div>`;
    this.activate('briefing');
  }

  private buildHud(): void {
    const el = this.screen('hud');
    el.innerHTML = `
      <div class="hud-top">
        <div class="hud-left">
          <div class="ammo-card">
            <div class="ammo-label"><span>Munição</span><span class="js-level">Fase 01</span></div>
            <div class="ammo-value"><span class="js-ammo">6</span><small class="js-ammo-note">restantes</small></div>
            <div class="ammo-pips js-pips"></div>
            <div class="hp-row js-hp"></div>
            <div class="unarmed-tag js-unarmed" hidden>Sem balas · use a katana</div>
          </div>
          <div class="abilities">
            <div class="ability"><span class="ab-key">Shift</span><span class="ab-name">Dash</span><div class="ab-bar"><i class="js-dash"></i></div></div>
            <div class="ability"><span class="ab-key">Dir.</span><span class="ab-name">Aparo</span><div class="ab-bar"><i class="js-parry"></i></div></div>
          </div>
          <div class="focus-meter js-focusbox">
            <div class="focus-head"><span class="focus-key">R</span><span class="focus-label js-focuslabel">Iai</span><span class="focus-pct js-focuspct">0</span></div>
            <div class="focus-track"><i class="js-focus"></i></div>
          </div>
        </div>
        <div class="hud-objective">
          <span class="obj-label js-act">Ato I</span>
          <span class="obj-main"><span class="js-objective">Onda 1/3</span> · <b class="js-enemies">4</b> restantes</span>
        </div>
        <div class="hud-right">
          <div class="hud-stat"><span class="k">Tempo</span><span class="v js-time">00:00</span></div>
          <div class="hud-stat"><span class="k">Fragmentos</span><span class="v gold js-frag">0/3</span></div>
          ${iconButton('pause', ICONS.pause, 'Pausar')}
          ${iconButton('mute', ICONS.sound, 'Som')}
        </div>
      </div>
      <div class="boss-bar js-boss" hidden>
        <div class="boss-head"><span class="boss-name js-bossname">O RELOJOEIRO</span><span class="boss-hp js-bosshp">14 / 14</span></div>
        <div class="boss-track"><i class="js-bossfill"></i></div>
      </div>
      <div class="hud-bottom">
        <div class="time-meter js-timemeter">
          <div class="tm-head"><span>Tempo do mundo</span><span class="tm-state js-timestate">Parado</span></div>
          <div class="tm-bar"><div class="tm-fill js-timefill"></div></div>
        </div>
        <div class="hud-tools">
          <div class="radar" aria-label="Radar de inimigos">
            <canvas width="180" height="180"></canvas>
            <span class="radar-n">N</span>
          </div>
          <div class="hud-hints">
            <span class="hint-row"><kbd>WASD</kbd> mover</span>
            <span class="hint-row"><kbd>clique</kbd> atirar</span>
            <span class="hint-row"><kbd>F</kbd> cortar</span>
            <span class="hint-row"><kbd>dir.</kbd> aparar</span>
            <span class="hint-row"><kbd>shift</kbd> dash</span>
          </div>
        </div>
      </div>
    `;
    const q = (sel: string) => el.querySelector(sel) as HTMLElement;
    this.hudRefs = {
      ammo: q('.js-ammo'),
      ammoNote: q('.js-ammo-note'),
      pips: q('.js-pips'),
      hp: q('.js-hp'),
      unarmed: q('.js-unarmed'),
      level: q('.js-level'),
      act: q('.js-act'),
      objective: q('.js-objective'),
      enemies: q('.js-enemies'),
      time: q('.js-time'),
      frag: q('.js-frag'),
      dash: q('.js-dash'),
      parry: q('.js-parry'),
      timeMeter: q('.js-timemeter'),
      timeState: q('.js-timestate'),
      timeFill: q('.js-timefill'),
      boss: q('.js-boss'),
      bossName: q('.js-bossname'),
      bossHp: q('.js-bosshp'),
      bossFill: q('.js-bossfill'),
      objectiveBox: q('.hud-objective'),
      radar: q('.radar canvas') as HTMLCanvasElement,
      focus: q('.js-focus'),
      focusBox: q('.js-focusbox'),
      focusLabel: q('.js-focuslabel'),
      focusPct: q('.js-focuspct'),
    };
    this.hudBuilt = true;
  }

  showHUD(): void {
    if (!this.hudBuilt) this.buildHud();
    this.activate('hud');
    this.lastHudKey = '';
  }

  updateHud(hud: HudState): void {
    if (this.active !== 'hud' || !this.hudRefs.ammo) return;
    const key = `${this.currentLevelId}|${hud.ammo}|${hud.hp}|${hud.maxHp}|${hud.wave}|${hud.enemies}|${hud.fragments}|${hud.bossHp}|${hud.unarmed}`;
    if (key !== this.lastHudKey) {
      this.lastHudKey = key;
      this.hudRefs.ammo.textContent = String(hud.ammo);
      this.hudRefs.ammoNote.textContent = hud.ammo === 0 ? 'vazio' : 'restantes';
      this.hudRefs.pips.innerHTML = Array.from({ length: Math.min(12, hud.ammo) }, () => '<i class="ammo-pip"></i>').join('');
      this.hudRefs.hp.innerHTML = Array.from({ length: hud.maxHp }, (_, i) => `<i class="hp-cell ${i < hud.hp ? '' : 'lost'}"></i>`).join('');
      this.hudRefs.unarmed.hidden = !hud.unarmed;
      this.hudRefs.enemies.textContent = String(hud.enemies);
      this.hudRefs.frag.textContent = `${hud.fragments}/${hud.fragmentsTotal}`;
      this.hudRefs.objective.textContent = `Onda ${Math.max(1, hud.wave)}/${hud.waves}`;
      const boss = hud.bossMax > 0;
      this.hudRefs.boss.hidden = !boss;
      this.hudRefs.objectiveBox.style.visibility = boss ? 'hidden' : 'visible';
      if (boss) {
        this.hudRefs.bossName.textContent = hud.bossName;
        this.hudRefs.bossHp.textContent = `${hud.bossHp} / ${hud.bossMax}`;
        this.hudRefs.bossFill.style.width = `${Math.max(0, (hud.bossHp / hud.bossMax) * 100)}%`;
      }
      const curLevel = LEVELS[Math.min(7, Math.max(0, hud.wave - 1))];
      if (this.currentLevelId) {
        const info = LEVELS.find((l) => l.id === this.currentLevelId);
        if (info) {
          this.hudRefs.level.textContent = `Fase ${String(info.id).padStart(2, '0')}`;
          this.hudRefs.act.textContent = toSentenceAct(ACTS.find((a) => a.id === info.act)?.name ?? '');
        }
      } else if (curLevel) {
        this.hudRefs.act.textContent = ACTS.find((a) => a.id === curLevel.act)?.name ?? '';
      }
    }
    this.hudRefs.time.textContent = fmtTime(hud.time);
    this.hudRefs.dash.style.width = `${Math.round(Math.max(0, Math.min(1, hud.dash)) * 100)}%`;
    this.hudRefs.parry.style.width = `${Math.round(Math.max(0, Math.min(1, hud.parry)) * 100)}%`;
    const focus = Math.max(0, Math.min(100, hud.focus));
    this.hudRefs.focus.style.width = `${Math.round(focus)}%`;
    this.hudRefs.focusBox.classList.toggle('ready', focus >= 100);
    this.hudRefs.focusLabel.textContent = focus >= 100 ? 'Iai pronto' : 'Iai';
    this.hudRefs.focusPct.textContent = String(Math.floor(focus));
    if (this.touchIai) this.touchIai.classList.toggle('ready', focus >= 100);
    const stopped = hud.timeScale < 0.45;
    this.hudRefs.timeMeter.classList.toggle('stopped', stopped);
    this.hudRefs.timeState.textContent = stopped ? 'Parado' : 'Andando';
    this.hudRefs.timeFill.style.width = `${Math.max(5, Math.round(hud.timeScale * 100))}%`;
    this.vignette.classList.toggle('on', stopped && this.active === 'hud');
    this.drawRadar(hud);
  }

  private drawRadar(hud: HudState): void {
    const canvas = this.hudRefs.radar as HTMLCanvasElement | undefined;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const c = size / 2;
    const r = size * 0.43;
    const range = 24;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(c, c);
    // body and rings
    ctx.fillStyle = 'rgba(15, 23, 21, 0.82)';
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(243, 232, 213, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(243, 232, 213, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();
    // view cone (camera always looks north)
    const cone = ctx.createLinearGradient(0, 0, 0, -r);
    cone.addColorStop(0, 'rgba(243, 232, 213, 0.14)');
    cone.addColorStop(1, 'rgba(243, 232, 213, 0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.42, -r * 0.98);
    ctx.lineTo(r * 0.42, -r * 0.98);
    ctx.closePath();
    ctx.fill();
    // blips
    for (const b of hud.radar) {
      let dx = (b.x - hud.playerX) / range * r;
      let dz = (b.z - hud.playerZ) / range * r;
      const d = Math.hypot(dx, dz);
      let alpha = 1;
      if (d > r) {
        dx = (dx / d) * r;
        dz = (dz / d) * r;
        alpha = 0.42;
      }
      ctx.globalAlpha = alpha;
      if (b.kind === 'coin') {
        ctx.fillStyle = '#e6b548';
        ctx.beginPath();
        ctx.arc(dx, dz, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (b.kind === 'boss') {
        ctx.fillStyle = '#ff6a4d';
        ctx.beginPath();
        ctx.arc(dx, dz, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f5e6cd';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(dx, dz, 8.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#e0523e';
        ctx.beginPath();
        ctx.arc(dx, dz, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // player arrow
    ctx.rotate(-hud.playerAngle + Math.PI);
    ctx.fillStyle = '#f3efe4';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private currentLevelId: number | null = null;

  setLevel(levelId: number): void {
    this.currentLevelId = levelId;
  }

  showPause(): void {
    const level = this.currentLevelId ? LEVELS.find((l) => l.id === this.currentLevelId) : null;
    const save = this.getSave();
    const difficulty = getDifficulty(save.difficulty);
    const el = this.screen('pause');
    el.innerHTML = `<div class="dark-card pause-card">
      <div class="kicker">${level ? `Fase ${String(level.id).padStart(2, '0')} · ${level.name.replace(/\n/g, ' ')}` : 'MOVESTOP'} · ${difficulty.label}</div>
      <h2>Pausa.</h2>
      <p>O tempo está do seu lado. Ele também espera.</p>
      <div class="pause-actions">
        <button class="btn lg wide" data-action="resume">Continuar</button>
        <div class="row"><button class="btn ghost" data-action="restart">Recomeçar</button><button class="btn ghost" data-action="quit">Sair</button></div>
        <button class="btn ghost sm wide" data-action="mute">${save.muted ? 'Som desligado' : 'Som ligado'}</button>
      </div>
    </div>`;
    this.activate('pause');
  }

  showDeath(view: DeathView): void {
    this.lastDeathView = view;
    const save = this.getSave();
    const canRevive = save.coins >= view.reviveCost;
    const missing = Math.max(0, view.reviveCost - save.coins);
    const el = this.screen('death');
    el.innerHTML = `<div class="dark-card death-card">
      <div class="kicker">Fase ${String(view.level.id).padStart(2, '0')} · ${view.level.name.replace(/\n/g, ' ')}</div>
      <h2>Você<br><em>parou.</em></h2>
      <p>O relógio não perdoa hesitação. Mas o ronin ainda pode voltar.</p>
      <div class="death-stats">
        <div class="ds">Abates<b>${view.kills}</b></div>
        <div class="ds">Tempo<b>${fmtTime(view.time)}</b></div>
        <div class="ds">Saldo<b>${fmtCoins(save.coins)}</b></div>
      </div>
      <div class="death-actions">
        <button class="btn lg wide" data-action="retry">Recomeçar</button>
        <button class="btn revive-btn wide" data-action="${canRevive ? 'revive' : 'revive-shop'}">Reviver · ${coin}${view.reviveCost}</button>
        ${!canRevive ? `<span class="revive-note">Faltam ${fmtCoins(missing)} moedas · ver pacotes</span>` : `<span class="revive-note">Você volta na hora, com o mundo congelado</span>`}
        <div class="row">
          <button class="btn ghost" data-action="shop">Loja</button>
          <button class="btn ghost" data-action="quit">Menu</button>
        </div>
      </div>
    </div>`;
    this.activate('death');
  }

  showWin(view: WinView): void {
    this.lastWinView = view;
    const save = this.getSave();
    const el = this.screen('win');
    const bossDone = view.level.id === LEVELS.length;
    el.innerHTML = `<div class="dark-card win-card">
      <div class="kicker">Fase ${String(view.level.id).padStart(2, '0')} · concluída</div>
      <h2>${bossDone ? 'O relógio<br><em>parou.</em>' : 'Tempo<br><em>limpo.</em>'}</h2>
      <div class="win-stars">${[0, 1, 2].map((i) => `<i class="star ${i < view.stars ? 'on' : ''}"></i>`).join('')}</div>
      <div class="win-rewards">
        <div><span class="k">Tempo</span><span class="v">${fmtTime(view.time)}</span></div>
        <div><span class="k">Fragmentos</span><span class="v">${view.fragments}/${view.fragmentsTotal}</span></div>
        <div><span class="k">Moedas</span><span class="v gold">+${fmtCoins(view.coinsEarned)}</span></div>
      </div>
      ${
        view.allDone
          ? `<div class="unlock-note">Campanha concluída. Obrigado por jogar o protótipo.</div>`
          : view.newlyUnlocked
            ? `<div class="unlock-note">Nova fase desbloqueada · ${view.newlyUnlocked.name.replace(/\n/g, ' ')}</div>`
            : ''
      }
      <div class="win-actions">
        ${
          view.nextIndex !== null
            ? `<button class="btn lg wide" data-action="next">Próxima fase <span class="arr">→</span></button>`
            : `<button class="btn lg wide" data-action="levels">Ver todas as fases</button>`
        }
        <div class="row">
          <button class="btn ghost" data-action="retry">Repetir</button>
          <button class="btn ghost" data-action="shop">Loja</button>
        </div>
        <button class="btn ghost sm" data-action="quit">Menu</button>
      </div>
      <p class="revive-note" style="margin-top:10px">Saldo: ${fmtCoins(save.coins)} moedas</p>
    </div>`;
    this.activate('win');
  }

  openItemModal(id: string): void {
    const item = findItem(id);
    if (!item) return;
    if (item.type === 'skin' && item.price === 0 && !this.getSave().owned.includes(id)) {
      this.showShop('moedas');
      this.toast('Exclusivo do Founder Pack', true);
      return;
    }
    const save = this.getSave();
    const missing = Math.max(0, item.price - save.coins);
    const affordable = missing === 0;
    this.modal.innerHTML = `<div class="modal-panel">
      <div class="modal-head">
        <span class="modal-kicker">Desbloquear item</span>
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
      </div>
      <div class="modal-preview">${itemPreview(item)}</div>
      <h3>${item.name}</h3>
      <p class="m-desc">${item.type === 'skin' ? `<b>${item.perkName}</b> · ${item.perkDesc}<br>` : ''}${item.desc}</p>
      <div class="checkout-line"><span class="k">Preço</span><span class="v">${coin}${fmtCoins(item.price)}</span></div>
      ${
        affordable
          ? `<div class="coin-big" style="justify-content:flex-start"><span class="k" style="font-family:var(--mono);font-size:9px;letter-spacing:.14em;opacity:.55">Saldo após</span><span class="n" style="font-size:22px">${fmtCoins(save.coins - item.price)}</span></div><button class="btn wide" data-action="confirm-item" data-id="${item.id}">Confirmar compra</button>`
          : `<div class="demo-note">Saldo insuficiente · faltam ${fmtCoins(missing)} moedas</div><button class="btn gold wide" data-action="go-packs">Ver pacotes de moedas</button>`
      }
      <button class="btn ghost sm wide" style="margin-top:8px" data-action="close-modal">Cancelar</button>
    </div>`;
    this.modal.classList.add('active');
  }

  openCheckout(packId: string): void {
    const pack = findPack(packId);
    if (!pack) return;
    this.currentPackId = packId;
    this.afterModalRefresh = false;
    this.modal.innerHTML = `<div class="modal-panel">
      <div class="modal-head">
        <span class="modal-kicker">Checkout · loja de moedas</span>
        <button class="modal-close" data-action="close-modal" aria-label="Fechar">×</button>
      </div>
      <div class="modal-preview">${packPreview(pack)}</div>
      <h3>${pack.name}</h3>
      <div class="coin-big"><span class="coin-glyph"></span><span class="n">${fmtCoins(pack.coins)}</span>${pack.bonus ? `<span class="bonus">${pack.bonus}</span>` : ''}</div>
      <p class="m-desc">${pack.desc}${pack.includes ? `<br><br><b>Inclui:</b> ${pack.includes.map((i) => findItem(i)?.name ?? i).join(' + ')}` : ''}</p>
      <div class="checkout-line"><span class="k">Total</span><span class="v">${formatBRL(pack.priceCents)}</span></div>
      <div class="method-row">
        <button class="method active" data-action="method">PIX</button>
        <button class="method" data-action="method">Cartão</button>
      </div>
      <div class="demo-note">AMBIENTE DE DEMONSTRAÇÃO. Nenhum valor será cobrado. Para produção: checkout hospedado + webhook de verificação.</div>
      <div class="modal-actions">
        <button class="btn wide" data-action="confirm-pack" data-id="${pack.id}">Pagar ${formatBRL(pack.priceCents)}</button>
        <button class="btn ghost sm wide" data-action="close-modal">Agora não</button>
      </div>
    </div>`;
    this.modal.classList.add('active');
  }

  private async confirmCheckout(): Promise<void> {
    if (!this.currentPackId) return;
    const pack = findPack(this.currentPackId);
    if (!pack) return;
    const payBtn = this.modal.querySelector('[data-action="confirm-pack"]') as HTMLButtonElement | null;
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span> PROCESSANDO…';
    }
    const result = await this.actions.confirmPack(pack.id);
    if (!result.ok) {
      this.modal.innerHTML = `<div class="modal-panel">
        <div class="modal-head"><span class="modal-kicker">CHECKOUT</span><button class="modal-close" data-action="close-modal">×</button></div>
        <h3>Algo falhou.</h3>
        <p class="m-desc">${result.error ?? 'Não foi possível concluir. Tente de novo.'}</p>
        <button class="btn wide" data-action="buy-pack" data-id="${pack.id}">Tentar de novo</button>
        <button class="btn ghost sm wide" style="margin-top:8px" data-action="close-modal">Cancelar</button>
      </div>`;
      return;
    }
    if (result.pending) {
      this.modal.innerHTML = `<div class="modal-panel">
        <div class="modal-head"><span class="modal-kicker">CHECKOUT EXTERNO</span><button class="modal-close" data-action="close-modal">×</button></div>
        <h3>Finalize em outra aba.</h3>
        <p class="m-desc">O checkout foi aberto. Assim que o pagamento for confirmado, as moedas serão creditadas após a verificação do servidor. Neste protótipo, o fluxo externo é apenas ilustrativo.</p>
        <button class="btn wide" data-action="close-modal">Entendi</button>
      </div>`;
      return;
    }
    const save = this.getSave();
    this.setCoins(save.coins);
    this.afterModalRefresh = true;
    this.toast(`Compra aprovada · +${fmtCoins(pack.coins)} moedas`, true);
    const items = pack.includes?.map((i) => findItem(i)?.name).filter(Boolean).join(' · ');
    this.modal.innerHTML = `<div class="modal-panel">
      <div class="checkout-success show">
        <div class="success-mark">${ICONS.check}</div>
        <div class="modal-kicker">Pagamento aprovado</div>
        <h3>Bem-vindo,<br>ronin.</h3>
        <div class="coin-big"><span class="coin-glyph"></span><span class="n">+${fmtCoins(pack.coins)}</span></div>
        ${items ? `<p class="m-desc"><b>Incluído:</b> ${items}</p>` : ''}
        <p class="m-desc">Saldo atual: ${fmtCoins(save.coins)} moedas${pack.bonus ? ` · bônus ${pack.bonus}` : ''}.<br>Obrigado por apoiar o protótipo.</p>
        <button class="btn wide" data-action="close-modal">Continuar</button>
      </div>
    </div>`;
    audioFeedback();
  }

  closeModal(): void {
    this.modal.classList.remove('active');
    this.modal.innerHTML = '';
    if (this.afterModalRefresh) {
      this.afterModalRefresh = false;
      this.refreshCurrent();
    }
  }

  isModalOpen(): boolean {
    return this.modal.classList.contains('active');
  }

  getActiveScreen(): string {
    return this.active;
  }

  setTouchIaiReady(ready: boolean): void {
    this.touchIai?.classList.toggle('ready', ready);
  }

  setCoins(coins: number): void {
    this.root.querySelectorAll('.js-coins').forEach((el) => {
      el.textContent = fmtCoins(coins);
    });
  }

  setMuted(muted: boolean): void {
    this.root.querySelectorAll('[data-action="mute"]').forEach((el) => {
      const btn = el as HTMLButtonElement;
      btn.innerHTML = muted ? ICONS.mute : ICONS.sound;
      btn.setAttribute('aria-label', muted ? 'Ativar som' : 'Silenciar');
    });
  }

  toast(message: string, gold = false): void {
    const t = document.createElement('div');
    t.className = `toast ${gold ? 'gold' : ''}`;
    t.textContent = message;
    this.toasts.appendChild(t);
    window.setTimeout(() => {
      t.classList.add('out');
      window.setTimeout(() => t.remove(), 320);
    }, 2300);
    while (this.toasts.children.length > 3) {
      this.toasts.removeChild(this.toasts.firstElementChild!);
    }
  }

  flashHit(): void {
    this.hitFlash.classList.remove('hit');
    void this.hitFlash.offsetWidth;
    this.hitFlash.classList.add('hit');
  }

  flashSpecial(): void {
    this.specialFlash.classList.remove('on');
    void this.specialFlash.offsetWidth;
    this.specialFlash.classList.add('on');
  }

  getLastDeath(): DeathView | null {
    return this.lastDeathView;
  }

  getLastWin(): WinView | null {
    return this.lastWinView;
  }

  hideScreens(): void {
    this.activate('none');
    this.root.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    document.body.classList.remove('playing');
    this.crosshair.classList.remove('active');
    this.vignette.classList.remove('on');
  }
}

function toSentenceAct(name: string): string {
  return name.replace(/^ATO\s+([IVX]+)$/i, 'Ato $1');
}

let audioCtxFeedback = false;
function audioFeedback(): void {
  if (audioCtxFeedback) return;
  audioCtxFeedback = true;
}
