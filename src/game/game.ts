import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ENEMY_DEFS,
  LEVELS,
  LevelDef,
  EnemyType,
  totalWaves,
  expandLevel,
  type Clock,
  type CloakTuning,
  type StalkTuning,
  type StrikeTuning,
} from './levels';
import { buildSandboxLevel } from './sandbox';
import { frameSlot } from './pacing';
import { NavGrid } from './navigation';
import { dodgeDirection } from './dodge';
import {
  byPhase,
  chooseRoninAttack,
  roninHealthAfterHit,
  type RoninAttack,
  type RoninPhase,
  type RoninTuning,
} from './ronin';
import type { SkinDef, ThemeDef, TrailDef } from './catalog';
import {
  BossAvatar,
  EnemyAvatar,
  PlayerAvatar,
  makeAmmoMesh,
  makeBulletMesh,
  makeCoinMesh,
  recolorBulletMesh,
} from './voxel';
import { FX } from './fx';
import { audio } from './audio';
import { buildLandscape, type Landscape } from './landscape';
import { getBiome, type BiomeId } from './biomes';
import { getTextures } from './textures';
import { airFor } from './atmosphere';
import { findSkin } from './catalog';
import {
  bossHpFor,
  enemyHpFor,
  getDifficulty,
  playerMaxHpFor,
  startingAmmoFor,
  type Difficulty,
  type DifficultyDef,
} from './difficulty';
import {
  analogMoveVector,
  canParryBullet,
  capSpeed,
  inCone,
  keyMoveVector,
  liveCount,
  moveCircle,
  nextCombo,
  resolveCircle,
  segAABB,
} from './movement';
import {
  DUEL_GRID,
  DUEL_RULES,
  duelColliders,
  spawnPoint,
  type DuelEvent,
  type DuelSnapshot,
} from '../shared/duel';

export interface Loadout {
  skin: SkinDef;
  theme: ThemeDef;
  trail: TrailDef;
  upgrades: string[];
  difficulty: Difficulty;
}

export interface RadarBlip {
  x: number;
  z: number;
  kind: 'enemy' | 'boss' | 'coin';
}

export interface HudState {
  ammo: number;
  radar: RadarBlip[];
  playerX: number;
  playerZ: number;
  playerAngle: number;
  enemies: number;
  wave: number;
  waves: number;
  fragments: number;
  fragmentsTotal: number;
  time: number;
  timeScale: number;
  hp: number;
  maxHp: number;
  dash: number;
  parry: number;
  unarmed: boolean;
  focus: number;
  bossHp: number;
  bossMax: number;
  bossName: string;
}

export interface GameResult {
  level: number;
  time: number;
  fragments: number;
  fragmentsTotal: number;
  kills: number;
  deaths: number;
}

export interface LevelInfo {
  level: LevelDef;
  ammo: number;
  maxHp: number;
  character: SkinDef;
  waves: number;
}

export interface GameEvents {
  onHud: (hud: HudState) => void;
  onLevelReady: (info: LevelInfo) => void;
  onWave: (wave: number, waves: number, boss: boolean) => void;
  onWin: (result: GameResult) => void;
  onDeath: (result: GameResult) => void;
  onPlayerHit: () => void;
  onSpecial: () => void;
}

type GameState = 'idle' | 'briefing' | 'playing' | 'paused' | 'dying' | 'dead' | 'won';

interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  active: boolean;
  kind: 'wall' | 'crate' | 'barrel' | 'boss' | 'rock';
  barrel?: Barrel;
  rock?: DestructibleRock;
}

interface PlayerState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  spawnX: number;
  spawnZ: number;
  aimX: number;
  aimZ: number;
  angle: number;
  hp: number;
  maxHp: number;
  ammo: number;
  fireCd: number;
  dashCd: number;
  dashMax: number;
  dashTime: number;
  dashX: number;
  dashZ: number;
  parryCd: number;
  parryTime: number;
  parryMax: number;
  parryRecovery: number;
  slashCd: number;
  slashCombo: number;
  slashWindow: number;
  slashTime: number;
  specialCd: number;
  parryRadius: number;
  invuln: number;
  moving: boolean;
  stepAcc: number;
  avatar: PlayerAvatar;
}

interface Enemy {
  type: EnemyType;
  x: number;
  z: number;
  angle: number;
  hp: number;
  alive: boolean;
  avatar: EnemyAvatar;
  fireTimer: number;
  windup: number;
  windupMax: number;
  windupClock: Clock;
  attackKind: 'shot' | 'bash' | 'lunge' | 'mortar' | 'wards' | 'grab' | 'strike';
  /** cooldown after a grab/strike, on the enemy's body clock */
  attackCd: number;
  /** 0..1; below 1 only for cloaked enemies */
  visibility: number;
  trailTimer: number;
  /** midboss state; null for every other enemy */
  ronin: RoninState | null;
  /** bullet sidestep (Impossible only): time left, pause before the next, direction */
  dodgeTime: number;
  dodgeCd: number;
  dodgeX: number;
  dodgeZ: number;
  aimAngle: number;
  bashRecovery: number;
  burstLeft: number;
  burstTimer: number;
  charge: number;
  strafeDir: number;
  grace: number;
  lungeTime: number;
  lungeCd: number;
  lungeX: number;
  lungeZ: number;
  laser: THREE.Line | null;
  laserMat: THREE.LineBasicMaterial | null;
  def: (typeof ENEMY_DEFS)[EnemyType];
}

/** Ground markings of the ronin: a permanent aura and one shape per attack. */
interface RoninMarks {
  group: THREE.Group;
  aura: THREE.Mesh;
  auraMat: THREE.MeshBasicMaterial;
  heavy: THREE.Group;
  quick: THREE.Group;
  lanes: THREE.Group[];
  attackMat: THREE.MeshBasicMaterial;
}

interface RoninState {
  tuning: RoninTuning;
  phase: RoninPhase;
  /**
   * stalk: walking in, choosing attacks · windup: an attack charging (world time)
   * recover: after the heavy cut, the only state where hits land
   * dash: thrown back by a hit · volley: firing arrows after the dash
   */
  mode: 'stalk' | 'windup' | 'recover' | 'dash' | 'volley';
  attack: RoninAttack | null;
  last: RoninAttack | null;
  timer: number;
  timerMax: number;
  cooldown: number;
  /** direction locked when an attack starts */
  aim: number;
  dashX: number;
  dashZ: number;
  volleyLeft: number;
  marks: RoninMarks;
}

interface Bullet {
  mesh: THREE.Group;
  x: number;
  z: number;
  vx: number;
  vz: number;
  owner: 'player' | 'enemy' | 'parried';
  fromBoss: boolean;
  fromEnemy: Enemy | null;
  parryable: boolean;
  life: number;
  alive: boolean;
}

interface Coin {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  taken: boolean;
  phase: number;
}

interface AmmoPickup {
  mesh: THREE.Mesh;
  x: number;
  z: number;
  taken: boolean;
  phase: number;
}

interface Barrel {
  x: number;
  z: number;
  mesh: THREE.Group;
  alive: boolean;
  fuse: number;
  collider: Collider;
}

interface DestructibleRock {
  x: number;
  z: number;
  mesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  collider: Collider;
}

interface GroundHazard {
  kind: 'mortar' | 'ward';
  x: number;
  z: number;
  radius: number;
  age: number;
  duration: number;
  clock: Clock;
  armed: boolean;
  active: boolean;
  owner: Enemy | null;
  mesh: THREE.Group;
  disc: THREE.Mesh;
  ring: THREE.Mesh;
}

interface Boss {
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  phase: number;
  angle: number;
  cooldown: number;
  windup: number;
  alive: boolean;
  avatar: BossAvatar;
  collider: Collider;
  addsSpawned: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const damp = (v: number, target: number, lambda: number, dt: number) =>
  v + (target - v) * (1 - Math.exp(-lambda * dt));

/** Elapsed seconds on a clock this frame (see `Clock` in levels.ts). */
function clockDt(clock: Clock, simDt: number, realDt: number): number {
  if (clock === 'real') return realDt;
  // simDt = realDt * timeScale, so this is realDt * (1 - timeScale)
  if (clock === 'inverted') return Math.max(0, realDt - simDt);
  return simDt;
}

export interface SandboxOptions {
  invulnerable: boolean;
  infiniteAmmo: boolean;
}

/** Frame rate caps. The menu only drifts its camera; power saving halves play. */
const PLAY_FPS = 60;
const SAVING_FPS = 30;
/** Campaign states whose scene is frozen behind a screen. */
const STILL_STATES: ReadonlySet<GameState> = new Set<GameState>(['paused', 'briefing', 'dead', 'won', 'idle']);
/** Frames drawn after the scene goes still, so the camera finishes settling. */
const SETTLE_FRAMES = 60;

/** Shared empty list: no allocation per frame when dodging is off. */
const NO_THREATS: readonly never[] = [];

/** How fast enemies turn to face the player, in world time. */
const ENEMY_TURN_RATE = 9;
/** Extra delay added to a shot that was cancelled by breaking line of sight. */
const LOS_BREAK_DELAY = 0.5;
/** Random extra seconds added to every enemy attack cooldown. */
const ENEMY_FIRE_JITTER = 0.7;

function angleLerp(a: number, b: number, t: number): number {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function segPointT(x0: number, z0: number, dx: number, dz: number, px: number, pz: number): number {
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return 0;
  return clamp(((px - x0) * dx + (pz - z0) * dz) / len2, 0, 1);
}

function hexCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

function lighten(hex: number, amount: number): number {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return c.getHex();
}



export class Game {
  private canvas: HTMLCanvasElement;
  private events: GameEvents;
  private loadout: Loadout;
  private difficulty: DifficultyDef;

  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private lastFrame = performance.now();
  private raf = 0;
  private resizeHandler: () => void;

  private hemi: THREE.HemisphereLight;
  private dir: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private lowQuality = false;
  private currentBiomeId: BiomeId = 'sakura';

  private menuGroup = new THREE.Group();
  private gameGroup = new THREE.Group();
  private menuDirty = true;
  private menuAngle = 0;
  private readonly reduceMenuMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private state: GameState = 'idle';
  private mode: 'menu' | 'game' | 'duel' = 'menu';
  private pausedFrom: GameState = 'playing';
  /** route finding on the arena grid; null outside the campaign arena */
  private nav: NavGrid | null = null;
  /** non-null while the dev sandbox arena is loaded */
  private sandbox: SandboxOptions | null = null;

  private level: LevelDef | null = null;
  private levelIndex = 0;
  private player: PlayerState | null = null;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private coins: Coin[] = [];
  private ammoPickups: AmmoPickup[] = [];
  private barrels: Barrel[] = [];
  private rocks: DestructibleRock[] = [];
  private hazards: GroundHazard[] = [];
  private colliders: Collider[] = [];
  private boss: Boss | null = null;
  private fx: FX;

  private waveIndex = -1;
  private nextWaveTimer = -1;
  private completionPending = false;
  private levelTime = 0;
  private kills = 0;
  private deaths = 0;
  private fragments = 0;
  private fragmentsTotal = 0;
  private timeScale = 0.04;
  private focus = 0;
  private slowmo = 0;
  private dashGhostTimer = 0;
  private shake = 0;
  private stateTimer = 0;
  private hudTimer = 0;
  private audioTimer = 0;
  private lastEnemySfx = 0;
  private realTime = 0;
  private qualityChecked = false;
  private sampleTime = 0;
  private sampleFrames = 0;

  private keys = new Set<string>();
  private touchMove = { x: 0, z: 0 };
  private touchAim = { x: 0, z: -1, active: false };
  private touchFire = false;
  private pointer = new THREE.Vector2(0, 0);
  private raycaster = new THREE.Raycaster();
  private aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.55);
  private aimPoint = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camSnap = true;
  private shakeOffset = new THREE.Vector3();

  private floorCellList: { x: number; z: number; row: number; col: number }[] = [];
  private halfW = 0;
  private halfH = 0;
  private landscape: Landscape | null = null;
  private menuLandscape: Landscape | null = null;

  private duelActive = false;
  private duelLocalId = '';
  private duelSide: 0 | 1 = 0;
  private duelRemote: { x: number; z: number; angle: number; avatar: PlayerAvatar; visible: boolean } | null = null;
  private duelRemoteSkin = '';
  private duelSnapshot: DuelSnapshot | null = null;
  private duelInput = { move: { x: 0, z: 0 }, aim: { x: 0, z: -1 }, firing: false };
  private duelBullets = new Map<number, {
    mesh: THREE.Group;
    x: number;
    z: number;
    vx: number;
    vz: number;
    angle: number;
    speed: number;
    life: number;
    owner: string;
    targetX: number;
    targetZ: number;
    targetLife: number;
  }>();

  constructor(canvas: HTMLCanvasElement, events: GameEvents, loadout: Loadout) {
    this.canvas = canvas;
    this.events = events;
    this.loadout = loadout;
    this.difficulty = getDifficulty(loadout.difficulty);

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.lowQuality = coarse || window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.lowQuality,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.75));
    // `false`: only the drawing buffer. Letting three.js write a pixel width/height
    // into the canvas style pinned it to the size the window had at load, so a
    // window that grew afterwards (a browser maximizing on open) showed the game
    // squeezed into the top-left corner. CSS (#stage, 100%) sizes it on screen.
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = !this.lowQuality;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 900);
    this.camera.position.set(0, 9.4, 11.2);

    this.hemi = new THREE.HemisphereLight(0xfffdf6, 0xc9c2af, 1.15);
    this.scene.add(this.hemi);
    this.dir = new THREE.DirectionalLight(0xfff4e4, 2.05);
    this.dir.position.set(-11, 17, -8);
    this.dir.castShadow = !this.lowQuality;
    this.dir.shadow.mapSize.set(2048, 2048);
    this.dir.shadow.camera.left = -17;
    this.dir.shadow.camera.right = 17;
    this.dir.shadow.camera.top = 17;
    this.dir.shadow.camera.bottom = -17;
    this.dir.shadow.camera.near = 1;
    this.dir.shadow.camera.far = 45;
    this.dir.shadow.bias = -0.0006;
    this.dir.shadow.normalBias = 0.02;
    this.scene.add(this.dir);
    this.scene.add(this.dir.target);

    this.ambient = new THREE.AmbientLight(0xfff4e2, 0.32);
    this.scene.add(this.ambient);

    this.scene.add(this.menuGroup);
    this.scene.add(this.gameGroup);

    this.fx = new FX(this.scene);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.lowQuality ? 0 : 0.22,
      0.55,
      0.82,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.applyTheme(this.loadout.theme);
    this.buildMenu();

    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
    window.visualViewport?.addEventListener('resize', this.resizeHandler);
    this.onResize();
    this.bindInput();
    this.loop();
  }

  getState(): GameState {
    return this.state;
  }

  getLevelIndex(): number {
    return this.levelIndex;
  }

  isPaused(): boolean {
    return this.state === 'paused';
  }

  setTouchMove(x: number, z: number): void {
    this.touchMove.x = Math.max(-1, Math.min(1, x));
    this.touchMove.z = Math.max(-1, Math.min(1, z));
  }

  setTouchAim(x: number, z: number, fire = false): void {
    const len = Math.hypot(x, z);
    if (len > 0.001) {
      this.touchAim.x = x / len;
      this.touchAim.z = z / len;
      this.touchAim.active = true;
      const p = this.player;
      if (p) {
        p.aimX = p.x + this.touchAim.x * 7;
        p.aimZ = p.z + this.touchAim.z * 7;
        p.angle = Math.atan2(this.touchAim.x, this.touchAim.z);
        if (fire) this.tryShoot();
      }
    }
    this.touchFire = fire;
  }

  setTouchFire(on: boolean): void {
    this.touchFire = on;
    if (!on) this.touchAim.active = false;
  }

  inputSlash(): void {
    this.trySlash();
  }

  inputParry(): void {
    this.tryParry();
  }

  inputDash(): void {
    this.tryDash();
  }

  inputSpecial(): void {
    this.trySpecial();
  }

  setLoadout(loadout: Loadout): void {
    this.wake(); // a new skin or theme must show even on a still screen
    const themeChanged = loadout.theme.id !== this.loadout.theme.id;
    const skinChanged = loadout.skin.id !== this.loadout.skin.id;
    this.loadout = loadout;
    this.difficulty = getDifficulty(loadout.difficulty);
    if (themeChanged) {
      this.applyTheme(loadout.theme, this.currentBiomeId);
      if (this.mode === 'menu') this.menuDirty = true;
    }
    if (skinChanged && this.player) this.player.avatar.setSkin(loadout.skin);
    if (skinChanged && this.mode === 'menu') this.menuDirty = true;
    if (this.menuDirty && this.mode === 'menu') this.buildMenu();
  }

  showMenu(): void {
    this.sandbox = null;
    this.touchFire = false;
    this.disposeLevel();
    this.mode = 'menu';
    this.currentBiomeId = 'sakura';
    this.applyTheme(this.loadout.theme, this.currentBiomeId);
    this.mode = 'menu';
    this.state = 'idle';
    this.gameGroup.visible = false;
    this.menuGroup.visible = true;
    this.menuDirty = true;
    this.fx.clear();
    if (this.menuDirty) this.buildMenu();
    this.camSnap = true;
    audio.setIntensity(0.2);
  }

  startLevel(index: number, autoStart = false): void {
    const authored = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, index))];
    this.sandbox = null;
    this.loadLevel(expandLevel(authored, 9), index, autoStart);
  }

  // ---------------------------------------------------------------- sandbox

  /** Dev arena: no waves, no progress, no rewards; enemies are spawned by hand. */
  startSandbox(): void {
    this.sandbox ??= { invulnerable: false, infiniteAmmo: true };
    this.loadLevel(buildSandboxLevel(), this.levelIndex, true);
  }

  isSandbox(): boolean {
    return this.sandbox !== null;
  }

  getSandboxOptions(): SandboxOptions | null {
    return this.sandbox ? { ...this.sandbox } : null;
  }

  setSandboxOption(key: keyof SandboxOptions, value: boolean): void {
    if (!this.sandbox) return;
    this.sandbox[key] = value;
    if (key === 'infiniteAmmo' && value && this.player) this.player.ammo = Math.max(this.player.ammo, 1);
    this.emitHud();
  }

  /** Spawns at the cursor (desktop aim point) or, failing that, at a safe random cell. */
  sandboxSpawn(type: EnemyType, at: 'cursor' | 'random' = 'cursor'): void {
    const p = this.player;
    if (!this.sandbox || !p || !this.level || this.state !== 'playing') return;
    const radius = ENEMY_DEFS[type].radius;
    let pos: { x: number; z: number };
    if (at === 'cursor') {
      pos = {
        x: clamp(p.aimX, -this.halfW + 1, this.halfW - 1),
        z: clamp(p.aimZ, -this.halfH + 1, this.halfH - 1),
      };
      resolveCircle(pos, radius, this.colliders);
    } else {
      const free = this.floorCellList.filter(
        (c) =>
          Math.hypot(c.x - p.x, c.z - p.z) > 4 &&
          Math.abs(c.x) < this.halfW - 1 &&
          Math.abs(c.z) < this.halfH - 1 &&
          !this.colliders.some((k) => k.active && c.x > k.minX - 0.6 && c.x < k.maxX + 0.6 && c.z > k.minZ - 0.6 && c.z < k.maxZ + 0.6),
      );
      const cell = free[Math.floor(Math.random() * free.length)];
      if (!cell) return;
      pos = { x: cell.x, z: cell.z };
    }
    this.spawnEnemy(type, pos.x, pos.z);
    this.emitHud();
  }

  /** The final boss (O Relojoeiro), in front of the player; replaces one already there. */
  sandboxSpawnBoss(): void {
    const p = this.player;
    if (!this.sandbox || !p || !this.level || this.state !== 'playing') return;
    this.removeBoss();
    const hp = LEVELS.find((l) => l.boss)?.boss?.hp ?? 14;
    const x = clamp(p.x, -this.halfW + 3, this.halfW - 3);
    const z = clamp(p.z - 7, -this.halfH + 3, this.halfH - 3);
    this.spawnBoss({ ...this.level, boss: { at: [0, 0], hp } }, x, z);
    this.fx.shock(x, z, 0xff3b2e, 3.2);
    audio.spawn();
    this.emitHud();
  }

  private removeBoss(): void {
    const boss = this.boss;
    if (!boss) return;
    boss.alive = false;
    boss.collider.active = false;
    boss.avatar.group.visible = false;
    this.boss = null;
  }

  /** Removes every enemy, bullet and hazard without rewards. */
  sandboxClear(): void {
    if (!this.sandbox) return;
    this.removeBoss();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.alive = false;
      e.avatar.group.visible = false;
      this.removeEnemyExtras(e);
    }
    this.clearBullets();
    this.clearHazards();
    this.emitHud();
  }

  sandboxFillFocus(): void {
    if (!this.sandbox) return;
    this.focus = 100;
    this.emitHud();
  }

  /** Live numbers for the sandbox panel. */
  sandboxStats(): { timeScale: number; enemies: number } {
    return { timeScale: this.timeScale, enemies: this.enemies.filter((e) => e.alive).length };
  }

  private loadLevel(level: LevelDef, index: number, autoStart: boolean): void {
    // reloading keeps the state ('briefing' -> 'briefing' on a difficulty change)
    this.wake();
    this.currentBiomeId = getBiome(level.id).id;
    this.applyTheme(this.loadout.theme, this.currentBiomeId);
    if (!this.lowQuality) {
      this.qualityChecked = false;
      this.sampleTime = 0;
      this.sampleFrames = 0;
    }
    audio.init();
    this.disposeLevel();
    this.mode = 'game';
    this.levelIndex = index;
    this.level = level;
    this.menuGroup.visible = false;
    this.gameGroup.visible = true;
    this.state = 'briefing';
    this.waveIndex = -1;
    this.nextWaveTimer = -1;
    this.completionPending = false;
    this.levelTime = 0;
    this.kills = 0;
    this.deaths = 0;
    this.fragments = 0;
    this.fragmentsTotal = 0;
    this.timeScale = 0.04;
    this.focus = 0;
    this.slowmo = 0;
    this.dashGhostTimer = 0;
    this.shake = 0;
    this.boss = null;
    this.buildArena(level);

    const skin = this.loadout.skin;
    const upgrades = new Set(this.loadout.upgrades);
    const maxHp = playerMaxHpFor(
      1 + (skin.extraHp ?? 0) + (upgrades.has('up-kabuto') ? 1 : 0),
      this.loadout.difficulty,
    );
    // the powder upgrade adds to a loaded level; an unarmed level stays unarmed
    const ammo = startingAmmoFor(
      level.ammo > 0 ? level.ammo + (upgrades.has('up-polvora') ? 2 : 0) : 0,
      this.loadout.difficulty,
    );
    const parryRadius = 1.9 * (skin.parryMult ?? 1) * (upgrades.has('up-ukaeshi') ? 1.2 : 1);
    const dashMax = 1.5 * (skin.dashMult ?? 1) * (upgrades.has('up-hayai') ? 0.65 : 1);
    const parryMax = 1.8 * (upgrades.has('up-ukaeshi') ? 0.6 : 1);

    const spawn = this.findPlayerSpawn(level);
    const avatar = new PlayerAvatar(skin);
    avatar.group.position.set(spawn.x, 0, spawn.z);
    avatar.group.scale.setScalar(1.72);
    this.gameGroup.add(avatar.group);
    this.player = {
      x: spawn.x,
      z: spawn.z,
      vx: 0,
      vz: 0,
      spawnX: spawn.x,
      spawnZ: spawn.z,
      aimX: spawn.x,
      aimZ: spawn.z - 2,
      angle: 0,
      hp: maxHp,
      maxHp,
      ammo,
      fireCd: 0,
      dashCd: 0,
      dashMax,
      dashTime: 0,
      dashX: 0,
      dashZ: -1,
      parryCd: 0,
      parryTime: 0,
      parryMax,
      parryRecovery: 0,
      slashCd: 0,
      slashCombo: 0,
      slashWindow: 0,
      slashTime: 0,
      specialCd: 0,
      parryRadius,
      invuln: 0,
      moving: false,
      stepAcc: 0,
      avatar,
    };

    this.camSnap = true;
    this.emitHud();
    if (autoStart) {
      this.beginPlay();
    } else {
      this.events.onLevelReady({
        level,
        ammo,
        maxHp,
        character: skin,
        waves: totalWaves(level),
      });
      audio.setIntensity(0.3);
    }
  }

  startDuel(side: 0 | 1, skin: SkinDef): void {
    this.disposeLevel();
    this.duelActive = true;
    this.duelSide = side;
    this.duelLocalId = '';
    this.duelRemote = null;
    this.duelRemoteSkin = '';
    this.duelSnapshot = null;
    this.duelInput = { move: { x: 0, z: 0 }, aim: { x: 0, z: -1 }, firing: false };
    this.mode = 'duel';
    this.state = 'playing';
    this.menuGroup.visible = false;
    this.gameGroup.visible = true;
    this.halfW = (DUEL_GRID[0].length - 1) / 2;
    this.halfH = (DUEL_GRID.length - 1) / 2;
    this.currentBiomeId = 'autumn';
    this.applyTheme(this.loadout.theme, 'autumn');
    this.colliders = duelColliders().map((c) => ({ ...c, active: true, kind: 'wall' as const }));
    this.landscape = buildLandscape({
      grid: DUEL_GRID,
      halfW: this.halfW,
      halfH: this.halfH,
      biome: getBiome(3),
      theme: this.loadout.theme,
      seed: 8801,
    });
    this.gameGroup.add(this.landscape.group);

    const localSpawn = spawnPoint(side);
    const remoteSide = side === 0 ? 1 : 0;
    const remoteSpawn = spawnPoint(remoteSide);
    const localAvatar = new PlayerAvatar(skin);
    localAvatar.group.position.set(localSpawn.x, 0, localSpawn.z);
    localAvatar.group.scale.setScalar(1.72);
    localAvatar.group.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.gameGroup.add(localAvatar.group);

    const remoteSkin = findSkin(side === 0 ? 'skin-oni' : 'skin-kitsune') ?? skin;
    const remoteAvatar = new PlayerAvatar(remoteSkin);
    remoteAvatar.group.position.set(remoteSpawn.x, 0, remoteSpawn.z);
    remoteAvatar.group.scale.setScalar(1.72);
    remoteAvatar.group.rotation.y = remoteSide === 0 ? Math.PI / 2 : -Math.PI / 2;
    this.gameGroup.add(remoteAvatar.group);

    this.player = {
      x: localSpawn.x,
      z: localSpawn.z,
      vx: 0,
      vz: 0,
      spawnX: localSpawn.x,
      spawnZ: localSpawn.z,
      aimX: localSpawn.x + (side === 0 ? 4 : -4),
      aimZ: localSpawn.z,
      angle: side === 0 ? Math.PI / 2 : -Math.PI / 2,
      hp: 1,
      maxHp: 1,
      ammo: DUEL_RULES.spawnAmmo,
      fireCd: 0,
      dashCd: 0,
      dashMax: DUEL_RULES.dashCooldown,
      dashTime: 0,
      dashX: 0,
      dashZ: -1,
      parryCd: 0,
      parryTime: 0,
      parryMax: DUEL_RULES.parryCooldown,
      parryRecovery: 0,
      parryRadius: DUEL_RULES.parryRadius,
      invuln: 0,
      moving: false,
      stepAcc: 0,
      slashCd: 0,
      slashCombo: 0,
      slashWindow: 0,
      slashTime: 0,
      specialCd: 0,
      avatar: localAvatar,
    };
    this.duelRemote = {
      x: remoteSpawn.x,
      z: remoteSpawn.z,
      angle: remoteSide === 0 ? Math.PI / 2 : -Math.PI / 2,
      avatar: remoteAvatar,
      visible: true,
    };
    this.camSnap = true;
    this.fx.clear();
    this.clearDuelBullets();
    this.duelSnapshot = null;
  }

  setDuelMove(x: number, z: number): void {
    const len = Math.hypot(x, z);
    this.duelInput.move.x = len > 1 ? x / len : x;
    this.duelInput.move.z = len > 1 ? z / len : z;
  }

  setDuelAim(x: number, z: number): void {
    const len = Math.hypot(x, z);
    if (len > 0.001) {
      this.duelInput.aim.x = x / len;
      this.duelInput.aim.z = z / len;
    }
  }

  setDuelFiring(on: boolean): void {
    this.duelInput.firing = on;
  }

  duelLocalAction(kind: 'shoot' | 'parry' | 'dash' | 'slash' | 'special'): void {
    const p = this.player;
    if (!p || !this.duelActive) return;
    if (kind === 'slash') {
      p.avatar.slash(0, false);
      p.slashCd = DUEL_RULES.slashCooldown;
    } else if (kind === 'parry') {
      p.avatar.pulseParry();
      p.parryCd = DUEL_RULES.parryCooldown;
    } else if (kind === 'dash') {
      const len = Math.hypot(this.duelInput.move.x, this.duelInput.move.z);
      const dx = len > 0.1 ? this.duelInput.move.x / len : this.duelInput.aim.x;
      const dz = len > 0.1 ? this.duelInput.move.z / len : this.duelInput.aim.z;
      p.dashTime = DUEL_RULES.dashTime;
      p.dashX = dx;
      p.dashZ = dz;
      p.dashCd = DUEL_RULES.dashCooldown;
      this.fx.afterimage(p.x, p.z, p.angle, this.loadout.skin.accent);
    } else if (kind === 'special') {
      p.avatar.iai();
    } else if (kind === 'shoot') {
      this.fx.sparks(p.x + Math.sin(p.angle) * 0.55, 0.6, p.z + Math.cos(p.angle) * 0.55, this.loadout.trail.color, 3, 2.2);
    }
  }

  screenAim(clientX: number, clientY: number): { x: number; z: number } {
    const p = this.player;
    if (!p) return { x: 0, z: -1 };
    const rect = this.canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), this.camera);
    if (this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint)) {
      const dx = this.aimPoint.x - p.x;
      const dz = this.aimPoint.z - p.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.01) return { x: dx / len, z: dz / len };
    }
    return { x: 0, z: -1 };
  }

  applyDuelSnapshot(snap: DuelSnapshot, localId: string): void {
    if (!this.duelActive) return;
    this.duelLocalId = localId;
    this.duelSnapshot = snap;
    const p = this.player;
    if (!p) return;
    const local = snap.players.find((x) => x.id === localId);
    const remote = snap.players.find((x) => x.id !== localId);
    if (!local || !this.duelRemote) return;
    p.hp = local.hp;
    p.maxHp = 1;
    p.ammo = local.ammo;
    p.avatar.group.visible = local.alive;
    const err = Math.hypot(local.x - p.x, local.z - p.z);
    if (err > 2.0 || snap.state !== 'live') {
      p.x = local.x;
      p.z = local.z;
      p.vx = 0;
      p.vz = 0;
    } else {
      p.x += (local.x - p.x) * 0.16;
      p.z += (local.z - p.z) * 0.16;
    }
    if (remote) {
      if (remote.skin && remote.skin !== this.duelRemoteSkin) {
        const remoteSkin = findSkin(remote.skin);
        if (remoteSkin) this.duelRemote.avatar.setSkin(remoteSkin);
        this.duelRemoteSkin = remote.skin;
      }
      this.duelRemote.avatar.group.visible = remote.alive;
      this.duelRemote.visible = remote.alive;
    }
    this.syncDuelBullets(snap);
    this.updateDuelCamera(0.016);
  }

  private syncDuelBullets(snap: DuelSnapshot): void {
    const alive = new Set(snap.bullets.map((b) => b.id));
    for (const [id, b] of this.duelBullets) {
      if (alive.has(id)) continue;
      this.gameGroup.remove(b.mesh); // shared resources: nothing to dispose
      this.duelBullets.delete(id);
    }
    for (const b of snap.bullets) {
      const existing = this.duelBullets.get(b.id);
      if (existing) {
        existing.targetX = b.x;
        existing.targetZ = b.z;
        existing.targetLife = b.life;
        existing.angle = b.angle;
        existing.speed = b.speed;
        existing.owner = b.owner;
        continue;
      }
      const local = b.owner === this.duelLocalId;
      const mesh = makeBulletMesh(local ? 0x7ff7ef : 0xff3b2e, local ? this.loadout.trail.color : 0xff5a3c, 1);
      mesh.position.set(b.x, 0.55, b.z);
      mesh.rotation.y = b.angle;
      this.gameGroup.add(mesh);
      this.duelBullets.set(b.id, {
        mesh,
        x: b.x,
        z: b.z,
        vx: Math.sin(b.angle) * b.speed,
        vz: Math.cos(b.angle) * b.speed,
        angle: b.angle,
        speed: b.speed,
        life: b.life,
        owner: b.owner,
        targetX: b.x,
        targetZ: b.z,
        targetLife: b.life,
      });
    }
  }

  private clearDuelBullets(): void {
    for (const b of this.duelBullets.values()) this.gameGroup.remove(b.mesh);
    this.duelBullets.clear();
  }

  duelEvent(event: DuelEvent): void {
    if (!this.duelActive) return;
    const local = event.who === this.duelLocalId;
    if (event.kind === 'shot') {
      audio.shoot();
      if (event.x !== undefined && event.z !== undefined) this.fx.sparks(event.x, 0.55, event.z, local ? 0x7ff7ef : 0xff3b2e, 3, 2.6);
    } else if (event.kind === 'parry') {
      audio.parry();
      if (event.x !== undefined && event.z !== undefined) this.fx.ring(event.x, event.z, 0x2ee6d0, 1.7, 0.4);
    } else if (event.kind === 'slash') {
      audio.slash(true);
      if (event.x !== undefined && event.z !== undefined) {
        this.fx.slash(event.x, event.z, event.angle ?? 0, local ? this.loadout.skin.accent : 0xff6a4d, 2.1, false);
      }
      if (!local && this.duelRemote) this.duelRemote.avatar.slash(0, false);
    } else if (event.kind === 'special') {
      audio.special();
      this.events.onSpecial();
      this.shake = Math.max(this.shake, 0.55);
      if (event.x !== undefined && event.z !== undefined) {
        const a = event.angle ?? 0;
        this.fx.specialLine(event.x - Math.sin(a) * 3, event.z - Math.cos(a) * 3, event.x, event.z, local ? this.loadout.skin.accent : 0xff6a4d);
        this.fx.shock(event.x, event.z, 0xfff1cf, 3.2);
      }
      if (!local && this.duelRemote) this.duelRemote.avatar.iai();
    } else if (event.kind === 'dash') {
      audio.dash();
      if (event.x !== undefined && event.z !== undefined) {
        this.fx.afterimage(event.x, event.z, event.angle ?? 0, local ? this.loadout.skin.accent : 0xff6a4d);
      }
    } else if (event.kind === 'hit') {
      audio.hit();
      this.shake = Math.max(this.shake, 0.5);
      if (event.x !== undefined && event.z !== undefined) this.fx.shock(event.x, event.z, 0xff3b2e, 2.6);
      if (event.target === this.duelLocalId) this.events.onPlayerHit();
    } else if (event.kind === 'round') {
      this.fx.confetti(this.player?.x ?? 0, this.player?.z ?? 0);
    } else if (event.kind === 'spawn') {
      if (this.player) this.fx.ring(this.player.x, this.player.z, this.loadout.skin.accent, 1.5, 0.5);
    }
  }

  private updateDuel(dt: number): void {
    const p = this.player;
    const remote = this.duelRemote;
    if (!p || !remote) return;
    const snap = this.duelSnapshot;
    const live = snap?.state === 'live' && p.hp > 0;
    const move = live ? this.duelInput.move : { x: 0, z: 0 };
    if (p.dashTime > 0) {
      p.dashTime = Math.max(0, p.dashTime - dt);
      p.vx = p.dashX * DUEL_RULES.dashSpeed;
      p.vz = p.dashZ * DUEL_RULES.dashSpeed;
    } else {
      p.vx = damp(p.vx, move.x * DUEL_RULES.moveSpeed, 14, dt);
      p.vz = damp(p.vz, move.z * DUEL_RULES.moveSpeed, 14, dt);
    }
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    this.collidePlayer(p);
    p.moving = Math.hypot(p.vx, p.vz) > 0.2;
    p.aimX = p.x + this.duelInput.aim.x * 7;
    p.aimZ = p.z + this.duelInput.aim.z * 7;
    if (live) p.angle = Math.atan2(this.duelInput.aim.x, this.duelInput.aim.z);
    p.avatar.group.position.set(p.x, 0, p.z);
    p.avatar.group.rotation.y = p.angle;
    p.avatar.animate(dt, p.moving, 1, p.dashTime > 0);

    const beforeRemoteX = remote.x;
    const beforeRemoteZ = remote.z;
    const k = 1 - Math.exp(-dt * 16);
    remote.x += (this.duelRemoteTargetX(remote) - remote.x) * k;
    remote.z += (this.duelRemoteTargetZ(remote) - remote.z) * k;
    const remoteSnap = snap?.players.find((x) => x.id !== this.duelLocalId);
    if (remoteSnap) {
      remote.angle = angleLerp(remote.angle, remoteSnap.angle, Math.min(1, dt * 18));
      const remoteMoving = Math.hypot(remote.x - beforeRemoteX, remote.z - beforeRemoteZ) > 0.008;
      remote.avatar.animate(dt, remoteMoving && remote.visible, 1);
    }
    remote.avatar.group.position.set(remote.x, 0, remote.z);
    remote.avatar.group.rotation.y = remote.angle;

    const simDt = dt * (snap?.timeScale ?? 0.04);
    for (const [id, b] of this.duelBullets) {
      b.life -= simDt;
      if (b.life <= 0) {
        this.gameGroup.remove(b.mesh);
        this.duelBullets.delete(id);
        continue;
      }
      b.x += b.vx * simDt;
      b.z += b.vz * simDt;
      b.x += (b.targetX - b.x) * Math.min(1, dt * 10);
      b.z += (b.targetZ - b.z) * Math.min(1, dt * 10);
      b.mesh.position.set(b.x, 0.55, b.z);
      b.mesh.rotation.y = b.angle;
    }

    this.landscape?.update(simDt, snap?.timeScale ?? 1);
    this.updateDuelCamera(dt);
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt * 2.4);
  }

  private duelRemoteTargetX(remote: { x: number; z: number }): number {
    return this.duelSnapshot?.players.find((p) => p.id !== this.duelLocalId)?.x ?? remote.x;
  }

  private duelRemoteTargetZ(remote: { x: number; z: number }): number {
    return this.duelSnapshot?.players.find((p) => p.id !== this.duelLocalId)?.z ?? remote.z;
  }

  private updateDuelCamera(dt: number): void {
    const p = this.player;
    const remote = this.duelRemote;
    if (!p || !remote) return;
    const mx = (p.x + remote.x) / 2;
    const mz = (p.z + remote.z) / 2;
    const sep = Math.min(14, Math.hypot(p.x - remote.x, p.z - remote.z));
    const wanted = new THREE.Vector3(mx, 6.85 + sep * 0.08, mz + 8.1 + sep * 0.14);
    const look = new THREE.Vector3(mx, 1.05, mz - 0.65);
    if (this.camSnap) {
      this.camera.position.copy(wanted);
      this.camLook.copy(look);
      this.camSnap = false;
    } else {
      const k = 1 - Math.exp(-dt * 3.6);
      this.camera.position.lerp(wanted, k);
      this.camLook.lerp(look, k);
    }
    this.dir.position.set(mx - 10, 18, mz + 13);
    this.dir.target.position.set(mx, 0, mz);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    const s = this.shake * this.shake;
    this.shakeOffset.set((Math.random() - 0.5) * s * 1.4, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 1.4);
    this.camera.position.add(this.shakeOffset);
    this.camera.lookAt(this.camLook.x + this.shakeOffset.x * 0.4, this.camLook.y, this.camLook.z + this.shakeOffset.z * 0.4);
  }

  beginPlay(): void {
    if (this.state !== 'briefing') return;
    this.state = 'playing';
    audio.init();
    audio.startMusic();
    this.spawnWave(0);
    this.emitHud();
  }

  pause(): void {
    if (this.state !== 'playing' && this.state !== 'briefing') return;
    this.pausedFrom = this.state;
    this.state = 'paused';
    // a stick/key held while the menu opened would otherwise keep "pressing" after resume
    this.releaseInputs();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.state = this.pausedFrom;
  }

  restartLevel(): void {
    if (!this.level) return;
    if (this.sandbox) this.startSandbox();
    else this.startLevel(this.levelIndex, true);
  }

  revive(): void {
    if (!this.player || !this.level) return;
    if (this.state !== 'dead' && this.state !== 'dying') return;
    const p = this.player;
    p.x = p.spawnX;
    p.z = p.spawnZ;
    p.vx = 0;
    p.vz = 0;
    p.hp = p.maxHp;
    p.invuln = 2.4;
    p.fireCd = 0;
    p.dashCd = 0;
    p.parryCd = 0;
    p.parryTime = 0;
    p.parryRecovery = 0;
    p.slashCd = 0;
    p.slashWindow = 0;
    p.slashCombo = 0;
    p.specialCd = 0;
    p.dashTime = 0;
    this.slowmo = 0;
    this.touchFire = false;
    p.ammo = Math.max(p.ammo, this.level.ammo);
    p.avatar.group.visible = true;
    p.avatar.group.rotation.x = 0;
    p.avatar.group.position.set(p.x, 0, p.z);
    this.clearBullets();
    this.clearHazards();
    this.deathSent = false;
    this.state = 'playing';
    this.camSnap = true;
    this.fx.ring(p.x, p.z, 0x2ee6d0, 2.2, 0.7);
    this.shake = 0.25;
    audio.parry();
    this.emitHud();
  }

  private applyTheme(theme: ThemeDef, biomeId: BiomeId = this.currentBiomeId): void {
    this.wake();
    const air = airFor(theme.id, biomeId);
    this.scene.background = new THREE.Color(air.horizon);
    this.scene.fog = new THREE.Fog(air.horizon, air.fogNear, air.fogFar);
    const washed = theme.id === 'theme-washi';
    this.hemi.color.setHex(washed ? air.mid : theme.sky);
    this.hemi.groundColor.setHex(washed ? lighten(theme.ground, 0.04) : theme.ground);
    this.hemi.intensity = this.lowQuality ? 1.15 : (air.night ? 0.78 : 1.12);
    this.dir.color.setHex(air.sun);
    this.dir.intensity = air.night ? 1.6 : biomeId === 'burnt' ? 2.5 : 2.55;
    this.ambient.color.setHex(air.mid);
    this.ambient.intensity = this.lowQuality ? 0.38 : (air.night ? 0.22 : 0.3);
  }

  private degradeQuality(): void {
    this.wake();
    this.lowQuality = true;
    this.bloom.enabled = false;
    this.renderer.shadowMap.enabled = false;
    this.dir.castShadow = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) if (m) m.needsUpdate = true;
    });
  }

  private onResize(): void {
    const viewport = window.visualViewport;
    const w = Math.max(1, Math.round(viewport?.width ?? window.innerWidth));
    const h = Math.max(1, Math.round(viewport?.height ?? window.innerHeight));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowQuality ? 1 : 1.75));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    document.documentElement.style.setProperty('--viewport-height', `${h}px`);
    // resizing clears the canvas: a still screen must draw again
    this.wake();
  }

  private bindInput(): void {
    window.addEventListener('keydown', (e) => {
      // typing in a text field (online room code, etc.) must never reach the game
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      // Holding a key makes the OS auto-repeat keydown; every action is one press, one try.
      if (e.repeat) return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.tryDash();
      if (e.code === 'KeyE' || e.code === 'KeyQ') this.tryParry();
      if (e.code === 'KeyF') this.trySlash();
      if (e.code === 'KeyR') this.trySpecial();
      if (e.code === 'Space') this.tryShoot();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.releaseInputs());

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('pointerdown', (e) => {
      if (document.body.classList.contains('touch')) return;
      if (this.state !== 'playing') return;
      if (e.button === 0) this.tryShoot();
      if (e.button === 2) this.tryParry();
    });
    window.addEventListener('pointermove', (e) => {
      // a finger on the joystick/buttons is not the cursor; it used to spin the character toward the thumb
      if (e.pointerType === 'touch') return;
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      // No CSS custom properties here: writing them on #ui made every mouse move
      // restyle the whole HUD (~2 ms each). The crosshair positions itself in ui.ts.
    });
  }

  private getMoveVector(): { x: number; z: number } {
    const touch = analogMoveVector(this.touchMove.x, this.touchMove.z);
    if (touch.x !== 0 || touch.z !== 0) return touch;
    return keyMoveVector(
      this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      this.keys.has('KeyD') || this.keys.has('ArrowRight'),
    );
  }

  /** Heading of the cursor/aim pad right now, so actions fire exactly where the player points. */
  private aimAngle(p: PlayerState): number {
    if (this.touchAim.active) return Math.atan2(this.touchAim.x, this.touchAim.z);
    const dx = p.aimX - p.x;
    const dz = p.aimZ - p.z;
    return Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : p.angle;
  }

  /** Snaps the facing to the aim before an attack; the smoothed angle lags ~50-100ms behind. */
  private faceAim(p: PlayerState): void {
    p.angle = this.aimAngle(p);
  }

  /** Releases every held input; used on pause, blur and level changes. */
  releaseInputs(): void {
    this.keys.clear();
    this.touchMove.x = 0;
    this.touchMove.z = 0;
    this.touchFire = false;
    this.touchAim.active = false;
  }

  private tryDash(): void {
    if (this.mode === 'duel') return;
    const p = this.player;
    if (!p || this.state !== 'playing' || p.dashCd > 0) return;
    const move = this.getMoveVector();
    let dx = move.x;
    let dz = move.z;
    if (dx === 0 && dz === 0) {
      const a = this.aimAngle(p);
      dx = Math.sin(a);
      dz = Math.cos(a);
    }
    p.dashTime = 0.16;
    p.dashX = dx;
    p.dashZ = dz;
    p.dashCd = p.dashMax;
    p.parryRecovery = 0;
    this.dashGhostTimer = 0;
    p.invuln = Math.max(p.invuln, 0.16);
    for (let i = 0; i < 3; i++) {
      this.fx.afterimage(p.x - dx * i * 0.22, p.z - dz * i * 0.22, p.angle, this.loadout.skin.accent);
    }
    this.fx.sparks(p.x, 0.18, p.z, 0xf1eee4, 7, 3);
    this.fx.dust(p.x, p.z, 0xbfae8c, 5);
    this.fx.ring(p.x, p.z, this.loadout.trail.color, 1.0, 0.3);
    audio.dash();
    this.shake = Math.max(this.shake, 0.08);
  }

  private tryShoot(): void {
    if (this.mode === 'duel') return;
    const p = this.player;
    if (!p || this.state !== 'playing' || p.fireCd > 0) return;
    if (p.ammo <= 0) {
      audio.empty();
      p.fireCd = 0.22;
      this.emitHud();
      return;
    }
    if (!this.sandbox?.infiniteAmmo) p.ammo -= 1;
    p.fireCd = 0.2;
    this.faceAim(p);
    const dx = Math.sin(p.angle);
    const dz = Math.cos(p.angle);
    const sx = p.x + dx * 0.58;
    const sz = p.z + dz * 0.58;
    const spread = 0.01;
    const a = p.angle + (Math.random() - 0.5) * spread;
    this.spawnBullet(sx, sz, a, 17.5, 'player', 0x7ff7ef, this.loadout.trail.color, 1, false, null);
    this.fx.sparks(sx, 0.56, sz, this.loadout.trail.color, 4, 3.2);
    this.shake = Math.max(this.shake, 0.075);
    audio.shoot();
    this.emitHud();
  }

  private trySlash(): void {
    if (this.mode === 'duel') return;
    const p = this.player;
    if (!p || this.state !== 'playing' || p.slashCd > 0) return;
    this.faceAim(p);
    const dashing = p.dashTime > 0;
    // slashCombo stores the index of the NEXT hit (it used to be incremented twice, skipping hit 2)
    const combo = nextCombo(p.slashWindow, p.slashCombo);
    const finisher = combo === 2 || dashing;
    const radius = dashing ? 3.1 : finisher ? 2.75 : 1.95;
    // half-angle of the swing: 1.35rad each side = 155 degrees in front
    const halfArc = finisher ? Math.PI : 1.35;
    p.slashCd = dashing ? 0.16 : 0.26;
    p.slashTime = 0.26;
    p.slashCombo = finisher ? 0 : combo + 1;
    p.slashWindow = 0.58;
    p.avatar.slash(combo, dashing);
    const lunge = dashing ? 0.7 : 0.32;
    this.movePlayer(p, Math.sin(p.angle) * lunge, Math.cos(p.angle) * lunge);

    let hits = 0;
    let cleared = 0;
    let reflected = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d > radius + e.def.radius) continue;
      if (!inCone(p.x, p.z, p.angle, e.x, e.z, halfArc)) continue;
      if (!this.hasLOS(p.x, p.z, e.x, e.z)) continue;
      const slashDamage = e.type === 'shield' || finisher || dashing ? 2 : 1;
      this.damageEnemy(e, slashDamage);
      hits++;
    }
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      if (!(finisher || dashing) && cleared >= 3) break;
      const d = Math.hypot(b.x - p.x, b.z - p.z);
      if (d > radius + 0.2) continue;
      if (!inCone(p.x, p.z, p.angle, b.x, b.z, halfArc)) continue;
      if (!this.hasLOS(p.x, p.z, b.x, b.z)) continue;
      if (b.parryable && (finisher || dashing) && reflected < 1) {
        this.reflectBullet(b);
        reflected++;
      } else {
        this.removeBullet(b);
      }
      cleared++;
    }
    for (const rock of this.rocks) {
      if (!rock.collider.active) continue;
      if (Math.hypot(rock.x - p.x, rock.z - p.z) > radius + 0.44) continue;
      if (!inCone(p.x, p.z, p.angle, rock.x, rock.z, halfArc)) continue;
      if (!this.hasLOS(p.x, p.z, rock.x, rock.z)) continue;
      this.damageRock(rock, 2);
      hits++;
    }
    for (const h of this.hazards) {
      if (!h.active || h.kind !== 'ward') continue;
      if (Math.hypot(h.x - p.x, h.z - p.z) > radius + 0.3) continue;
      if (!inCone(p.x, p.z, p.angle, h.x, h.z, halfArc)) continue;
      if (!this.hasLOS(p.x, p.z, h.x, h.z)) continue;
      this.destroyHazard(h);
      hits++;
    }
    if (this.boss && this.boss.alive) {
      const d = Math.hypot(this.boss.x - p.x, this.boss.z - p.z);
      if (d < radius + 1.2 && inCone(p.x, p.z, p.angle, this.boss.x, this.boss.z, halfArc)) {
        this.damageBoss();
        hits++;
      }
    }
    for (const barrel of this.barrels) {
      if (!barrel.alive) continue;
      if (Math.hypot(barrel.x - p.x, barrel.z - p.z) >= radius) continue;
      if (!this.hasLOS(p.x, p.z, barrel.x, barrel.z)) continue;
      if (inCone(p.x, p.z, p.angle, barrel.x, barrel.z, halfArc)) this.igniteBarrel(barrel);
    }
    if (hits > 0 || cleared > 0) {
      this.focus = Math.min(100, this.focus + hits * 7 + cleared * 4 + (dashing ? 5 : 0));
      this.shake = Math.max(this.shake, finisher ? 0.34 : 0.18);
      this.fx.sparks(p.x + Math.sin(p.angle) * 0.8, 0.6, p.z + Math.cos(p.angle) * 0.8, 0xfff1cf, 7, 4);
    }
    this.fx.slash(p.x, p.z, p.angle, this.loadout.skin.accent, radius, finisher);
    audio.slash(hits + cleared > 0);
    this.emitHud();
  }

  private trySpecial(): void {
    if (this.mode === 'duel') return;
    const p = this.player;
    if (!p || this.state !== 'playing' || p.specialCd > 0) return;
    if (this.focus < 100) {
      audio.empty();
      return;
    }
    this.focus = 0;
    p.specialCd = 0.9;
    p.invuln = Math.max(p.invuln, 1.0);
    this.faceAim(p);
    const angle = p.angle;
    const fromX = p.x;
    const fromZ = p.z;
    const reach = this.loadout.skin.id === 'skin-kitsune' ? 4.4 : 3.3;
    // swept, so the Iai stops at the first wall instead of teleporting past it
    this.movePlayer(p, Math.sin(angle) * reach, Math.cos(angle) * reach);
    const toX = p.x;
    const toZ = p.z;
    p.avatar.iai();
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      this.fx.afterimage(fromX + (p.x - fromX) * t, fromZ + (p.z - fromZ) * t, angle, this.loadout.skin.accent);
    }
    this.slowmo = 0.5;
    this.shake = Math.max(this.shake, 0.9);

    const len = Math.hypot(toX - fromX, toZ - fromZ) || 1;
    const vx = (toX - fromX) / len;
    const vz = (toZ - fromZ) / len;
    const killNearLine = (x: number, z: number): boolean => {
      const t = Math.max(0, Math.min(1, ((x - fromX) * vx + (z - fromZ) * vz) / len));
      return Math.hypot(x - (fromX + vx * t * len), z - (fromZ + vz * t * len)) < 1.75;
    };
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (!this.hasLOS(fromX, fromZ, e.x, e.z)) continue;
      if (killNearLine(e.x, e.z) || Math.hypot(e.x - toX, e.z - toZ) < 2.2) this.killEnemy(e);
    }
    if (this.boss && this.boss.alive && (killNearLine(this.boss.x, this.boss.z) || Math.hypot(this.boss.x - toX, this.boss.z - toZ) < 2.7) && this.hasLOS(fromX, fromZ, this.boss.x, this.boss.z)) {
      this.damageBoss();
      this.damageBoss();
    }
    let reflected = 0;
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'enemy' || !b.parryable) continue;
      if (!this.hasLOS(fromX, fromZ, b.x, b.z)) continue;
      if (reflected >= 2) break;
      if (killNearLine(b.x, b.z) || Math.hypot(b.x - toX, b.z - toZ) < 2.2) {
        this.reflectBullet(b);
        reflected++;
      }
    }
    for (const rock of this.rocks) {
      if (rock.collider.active && killNearLine(rock.x, rock.z)) this.damageRock(rock, 99);
    }
    for (const h of this.hazards) {
      if (!h.active || h.kind !== 'ward') continue;
      if (killNearLine(h.x, h.z) || Math.hypot(h.x - toX, h.z - toZ) < 1.4) this.destroyHazard(h);
    }
    for (const barrel of this.barrels) {
      if (barrel.alive && killNearLine(barrel.x, barrel.z)) this.igniteBarrel(barrel);
    }
    this.fx.specialLine(fromX, fromZ, toX, toZ, this.loadout.skin.accent);
    this.fx.shock(toX, toZ, this.loadout.skin.accent, 3.6);
    this.fx.ring(fromX, fromZ, 0xfff1cf, 2.2, 0.5);
    audio.special();
    this.events.onSpecial();
    this.emitHud();
  }

  private tryParry(): void {
    if (this.mode === 'duel') return;
    const p = this.player;
    if (!p || this.state !== 'playing' || p.parryCd > 0 || p.parryRecovery > 0) return;
    this.faceAim(p);
    p.parryTime = this.difficulty.parryWindow;
    p.parryCd = p.parryMax;
    p.parryRecovery = this.difficulty.parryRecovery;
    p.avatar.pulseParry();
    this.fx.ring(p.x, p.z, 0x2ee6d0, p.parryRadius * 0.55, 0.22);
    audio.parry();
    this.emitHud();
  }

  /** One guard action can deflect exactly one common projectile. */
  private parryNearby(): void {
    const p = this.player;
    if (!p || p.parryTime <= 0) return;
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'enemy' || !b.parryable) continue;
      if (!canParryBullet(p.x, p.z, p.angle, b.x, b.z, b.vx, b.vz, p.parryRadius)) continue;
      if (!this.hasLOS(p.x, p.z, b.x, b.z)) continue;
      this.reflectBullet(b);
      p.parryTime = 0;
      p.parryRecovery = Math.min(p.parryRecovery, 0.1);
      this.fx.ring(p.x, p.z, 0x2ee6d0, p.parryRadius * 0.9, 0.36);
      this.fx.sparks(p.x, 0.7, p.z, 0xffd76a, 10, 5);
      this.shake = Math.max(this.shake, 0.14);
      this.focus = Math.min(100, this.focus + 6);
      this.emitHud();
      return;
    }
  }

  /** Called before an enemy bullet applies damage, so a late-frame parry is not skipped. */
  private tryParryBullet(b: Bullet, bx = b.x, bz = b.z): boolean {
    const p = this.player;
    if (!p || p.parryTime <= 0 || b.owner !== 'enemy' || !b.parryable) return false;
    if (!canParryBullet(p.x, p.z, p.angle, b.x, b.z, b.vx, b.vz, p.parryRadius, bx, bz)) return false;
    if (!this.hasLOS(p.x, p.z, bx, bz)) return false;
    this.reflectBullet(b);
    p.parryTime = 0;
    p.parryRecovery = Math.min(p.parryRecovery, 0.1);
    this.fx.ring(p.x, p.z, 0x2ee6d0, p.parryRadius, 0.3);
    this.focus = Math.min(100, this.focus + 6);
    this.emitHud();
    return true;
  }

  private reflectBullet(b: Bullet): void {
    const p = this.player!;
    const a = p.angle;
    b.vx = Math.sin(a) * 20;
    b.vz = Math.cos(a) * 20;
    b.owner = 'parried';
    b.fromBoss = false;
    b.fromEnemy = null;
    b.life = 3;
    b.mesh.rotation.y = a;
    // bullet materials are shared: switch this one to the gold set, never repaint in place
    recolorBulletMesh(b.mesh, 0xffd23f, 0xffb01c, 0xffd23f);
    this.fx.sparks(b.x, 0.55, b.z, 0xffd23f, 4, 3);
  }

  private spawnBullet(
    x: number,
    z: number,
    angle: number,
    speed: number,
    owner: 'player' | 'enemy' | 'parried',
    color: number,
    trail: number,
    size: number,
    fromBoss: boolean,
    fromEnemy: Enemy | null,
    parryable = true,
  ): void {
    const mesh = makeBulletMesh(color, trail, size);
    mesh.position.set(x, 0.55, z);
    mesh.rotation.y = angle;
    this.gameGroup.add(mesh);
    this.bullets.push({
      mesh,
      x,
      z,
      vx: Math.sin(angle) * speed,
      vz: Math.cos(angle) * speed,
      owner,
      fromBoss,
      fromEnemy,
      parryable,
      life: 4,
      alive: true,
    });
  }

  private buildArena(level: LevelDef): void {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    this.halfW = (cols - 1) / 2;
    this.halfH = (rows - 1) / 2;
    this.nav = new NavGrid(cols, rows);
    this.floorCellList = [];

    const crateCells: { row: number; col: number }[] = [];
    const barrelCells: { row: number; col: number }[] = [];
    const rockCells: { row: number; col: number }[] = [];
    const coinCells: { row: number; col: number }[] = [];
    let playerSpawn: { row: number; col: number } | null = null;

    // The grid still drives collision and level design. Visually, walls are
    // replaced by landscape props (trees, rocks, bamboo), never black boxes.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = level.grid[r][c];
        const x = c - this.halfW;
        const z = r - this.halfH;
        this.floorCellList.push({ row: r, col: c, x, z });
        if (ch === '#') {
          this.colliders.push({
            minX: x - 0.5,
            maxX: x + 0.5,
            minZ: z - 0.5,
            maxZ: z + 0.5,
            active: true,
            kind: 'wall',
          });
        } else if (ch === 'x') {
          crateCells.push({ row: r, col: c });
        } else if (ch === 'b') {
          barrelCells.push({ row: r, col: c });
        } else if (ch === 'R') {
          rockCells.push({ row: r, col: c });
        } else if (ch === 'o') {
          coinCells.push({ row: r, col: c });
        } else if (ch === 'P') {
          playerSpawn = { row: r, col: c };
        }
      }
    }

    const biome = getBiome(level.id);
    this.landscape = buildLandscape({
      grid: level.grid,
      halfW: this.halfW,
      halfH: this.halfH,
      biome,
      theme: this.loadout.theme,
      seed: level.id * 911 + 31,
    });
    this.gameGroup.add(this.landscape.group);

    const spawnCell = playerSpawn ?? { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
    const spawnX = spawnCell.col - this.halfW;
    const spawnZ = spawnCell.row - this.halfH;
    const nearCamera = (x: number, z: number): boolean => z > spawnZ + 2 && Math.abs(x - spawnX) < 9;

    // cover: crates are hand-built boxes, not walls
    const tex = getTextures(this.loadout.theme);
    const crateMat = new THREE.MeshStandardMaterial({
      map: tex.wood,
      color: biome.id === 'snow' ? 0xc7c2b5 : biome.id === 'burnt' ? 0x8e7962 : 0xc7a176,
      roughness: 0.9,
      metalness: 0,
    });
    const crateGeo = new THREE.BoxGeometry(0.86, 0.9, 0.86);
    for (const cell of crateCells) {
      const x = cell.col - this.halfW;
      const z = cell.row - this.halfH;
      if (nearCamera(x, z)) continue;
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(x, 0.45, z);
      crate.rotation.y = (cell.row * 3 + cell.col) % 2 === 0 ? 0.08 : -0.06;
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.gameGroup.add(crate);
      this.colliders.push({
        minX: x - 0.43,
        maxX: x + 0.43,
        minZ: z - 0.43,
        maxZ: z + 0.43,
        active: true,
        kind: 'crate',
      });
    }

    // powder kegs
    for (const cell of barrelCells) {
      const x = cell.col - this.halfW;
      const z = cell.row - this.halfH;
      if (nearCamera(x, z)) continue;
      this.createBarrel(x, z);
    }

    // cracked rocks: real cover that can be removed under pressure
    for (const cell of rockCells) {
      const x = cell.col - this.halfW;
      const z = cell.row - this.halfH;
      if (nearCamera(x, z)) continue;
      this.createRock(x, z);
    }

    // fragments
    for (const cell of coinCells) {
      const mesh = makeCoinMesh();
      const x = cell.col - this.halfW;
      const z = cell.row - this.halfH;
      mesh.position.set(x, 0.55, z);
      this.gameGroup.add(mesh);
      this.coins.push({ mesh, x, z, taken: false, phase: Math.random() * 6 });
      this.fragmentsTotal++;
    }

    // boss
    if (level.boss) {
      const [br, bc] = level.boss.at;
      this.spawnBoss(level, bc - this.halfW, br - this.halfH);
    }

    if (!playerSpawn) playerSpawn = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
    this.playerSpawnCell = playerSpawn;
  }

  private playerSpawnCell = { row: 6, col: 8 };

  private findPlayerSpawn(level: LevelDef): { x: number; z: number } {
    for (let r = 0; r < level.grid.length; r++) {
      const c = level.grid[r].indexOf('P');
      if (c >= 0) {
        return { x: c - this.halfW, z: r - this.halfH };
      }
    }
    return { x: 0, z: 0 };
  }

  private createBarrel(x: number, z: number): void {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8f2a1c, roughness: 0.72 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x2a2026, roughness: 0.5, metalness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.78, 0.7), bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.74), bandMat);
    band1.position.y = 0.22;
    const band2 = band1.clone();
    band2.position.y = 0.58;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), bandMat);
    cap.position.y = 0.82;
    group.add(body, band1, band2, cap);
    group.position.set(x, 0, z);
    this.gameGroup.add(group);
    const collider: Collider = {
      minX: x - 0.37,
      maxX: x + 0.37,
      minZ: z - 0.37,
      maxZ: z + 0.37,
      active: true,
      kind: 'barrel',
    };
    const barrel: Barrel = { x, z, mesh: group, alive: true, fuse: -1, collider };
    collider.barrel = barrel;
    this.barrels.push(barrel);
    this.colliders.push(collider);
  }

  private createRock(x: number, z: number): void {
    const maxHp = this.loadout.difficulty === 'impossible' ? 3 : 2;
    const mat = new THREE.MeshStandardMaterial({
      color: getBiome(this.level!.id).id === 'snow' ? 0x9a9a93 : 0x68675f,
      roughness: 0.96,
      metalness: 0.02,
      emissive: 0x000000,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.05, 0.88), mat);
    mesh.position.set(x, 0.52, z);
    mesh.rotation.y = ((Math.round(x * 7 + z * 11) % 5) - 2) * 0.035;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.gameGroup.add(mesh);
    const collider: Collider = {
      minX: x - 0.44,
      maxX: x + 0.44,
      minZ: z - 0.44,
      maxZ: z + 0.44,
      active: true,
      kind: 'rock',
    };
    const rock: DestructibleRock = { x, z, mesh, hp: maxHp, maxHp, collider };
    collider.rock = rock;
    this.rocks.push(rock);
    this.colliders.push(collider);
  }

  private damageRock(rock: DestructibleRock, amount: number): void {
    if (!rock.collider.active || amount <= 0) return;
    rock.hp = Math.max(0, rock.hp - amount);
    const mat = rock.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(rock.hp > 0 ? 0x5b3b16 : 0x000000);
    mat.emissiveIntensity = rock.hp > 0 ? 0.65 : 0;
    this.fx.sparks(rock.x, 0.6, rock.z, 0xd8c8a4, 6, 3.5);
    audio.impact();
    if (rock.hp > 0) return;
    rock.collider.active = false;
    rock.mesh.visible = false;
    this.fx.debris(rock.x, 0.55, rock.z, 0x77736a, 14, 4.8, 0.13);
    this.fx.ring(rock.x, rock.z, 0xb7aa8e, 1.5, 0.4);
    this.shake = Math.max(this.shake, 0.18);
  }

  private spawnBoss(level: LevelDef, x: number, z: number): void {
    if (!level.boss) return;
    const avatar = new BossAvatar(0xff3b2e);
    avatar.group.position.set(x, 0, z);
    avatar.group.scale.setScalar(1.35);
    this.gameGroup.add(avatar.group);
    const collider: Collider = {
      minX: x - 1.2,
      maxX: x + 1.2,
      minZ: z - 1.2,
      maxZ: z + 1.2,
      active: true,
      kind: 'boss',
    };
    this.colliders.push(collider);
    const bossHp = bossHpFor(level.boss.hp, this.loadout.difficulty);
    this.boss = {
      x,
      z,
      hp: bossHp,
      maxHp: bossHp,
      phase: 1,
      angle: 0,
      cooldown: 2.2,
      windup: 0,
      alive: true,
      avatar,
      collider,
      addsSpawned: 0,
    };
  }

  private spawnWave(index: number): void {
    if (!this.level) return;
    this.waveIndex = index;
    this.nextWaveTimer = -1;
    const waves = totalWaves(this.level);
    this.events.onWave(index + 1, waves, Boolean(this.level.boss));

    if (this.level.boss) {
      this.fx.ring(this.boss!.x, this.boss!.z, 0xff3b2e, 3.2, 0.9);
      this.fx.debris(this.boss!.x, 0.4, this.boss!.z, 0xff3b2e, 16, 5);
      audio.spawn();
      return;
    }

    const spawns = this.level.waves[index];
    if (!spawns) return;
    for (const spawn of spawns) {
      const pos = this.safeSpawn(spawn.at[0], spawn.at[1]);
      this.spawnEnemy(spawn.type, pos.x, pos.z);
    }
  }

  private safeSpawn(row: number, col: number): { x: number; z: number } {
    const level = this.level!;
    const wants: { x: number; z: number } = { x: col - this.halfW, z: row - this.halfH };
    const blocked = (x: number, z: number) => {
      for (const c of this.colliders) {
        if (!c.active) continue;
        if (x > c.minX - 0.5 && x < c.maxX + 0.5 && z > c.minZ - 0.5 && z < c.maxZ + 0.5) return true;
      }
      return false;
    };
    const p = this.player;
    const farEnough = (x: number, z: number) => !p || Math.hypot(x - p.x, z - p.z) > 3.6;
    const notBehindCamera = (x: number, z: number) => !p || !(z > p.z + 2.4 && Math.abs(x - p.x) < 10);
    if (!blocked(wants.x, wants.z) && farEnough(wants.x, wants.z) && notBehindCamera(wants.x, wants.z)) return wants;
    const candidates = this.floorCellList
      .filter((cell) => {
        if (cell.row <= 0 || cell.col <= 0 || cell.row >= level.grid.length - 1 || cell.col >= level.grid[0].length - 1)
          return false;
        return !blocked(cell.x, cell.z) && farEnough(cell.x, cell.z) && notBehindCamera(cell.x, cell.z);
      })
      .sort((a, b) => {
        if (!p) return 0;
        const da = Math.hypot(a.x - p.x, a.z - p.z);
        const db = Math.hypot(b.x - p.x, b.z - p.z);
        return db - da;
      });
    if (candidates.length > 0) return { x: candidates[0].x, z: candidates[0].z };
    return wants;
  }

  private spawnEnemy(type: EnemyType, x: number, z: number): void {
    const def = ENEMY_DEFS[type];
    const avatar = new EnemyAvatar(def.color, def.body, def.scale * 1.55, type);
    avatar.group.position.set(x, 0, z);
    this.gameGroup.add(avatar.group);

    let laser: THREE.Line | null = null;
    let laserMat: THREE.LineBasicMaterial | null = null;
    if (type === 'sniper') {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 1.0, z), new THREE.Vector3(x, 0.6, z - 1)]);
      laserMat = new THREE.LineBasicMaterial({ color: 0xff3d6a, transparent: true, opacity: 0, depthWrite: false });
      laser = new THREE.Line(geo, laserMat);
      laser.visible = false;
      // its endpoints are rewritten every frame; the bounding sphere of the first two points would cull it
      laser.frustumCulled = false;
      this.gameGroup.add(laser);
    }

    this.enemies.push({
      type,
      x,
      z,
      angle: Math.atan2((this.player?.x ?? 0) - x, (this.player?.z ?? 0) - z),
      hp: enemyHpFor(type, this.loadout.difficulty),
      alive: true,
      avatar,
      fireTimer: 1.1 + Math.random() * 1.2,
      attackCd: 0,
      visibility: 1,
      trailTimer: 0,
      ronin: def.ronin ? this.createRoninState(def.ronin, def.color, x, z) : null,
      dodgeTime: 0,
      dodgeCd: 0,
      dodgeX: 0,
      dodgeZ: 0,
      windup: 0,
      windupMax: 0,
      windupClock: 'world',
      attackKind: 'shot',
      aimAngle: Math.atan2((this.player?.x ?? 0) - x, (this.player?.z ?? 0) - z),
      bashRecovery: 0,
      burstLeft: 0,
      burstTimer: 0,
      charge: 0,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      grace: 0.65,
      lungeTime: 0,
      lungeCd: 0,
      lungeX: 0,
      lungeZ: 0,
      laser,
      laserMat,
      def,
    });

    this.fx.ring(x, z, def.color, 0.9, 0.45);
    this.fx.debris(x, 0.3, z, def.color, 5, 2.4, 0.07);
  }

  private spawnBossAdds(count: number): void {
    if (!this.boss || !this.level) return;
    const spots: [number, number][] = [
      [5, 1],
      [5, 15],
      [10, 1],
      [10, 15],
      [7, 1],
      [7, 15],
    ];
    for (let i = 0; i < count; i++) {
      const spot = spots[(this.boss.addsSpawned + i) % spots.length];
      const pos = this.safeSpawn(spot[0], spot[1]);
      this.spawnEnemy(i % 2 === 0 ? 'gunner' : 'burster', pos.x, pos.z);
      this.fx.ring(pos.x, pos.z, 0xffb02e, 1.4, 0.55);
      this.boss.addsSpawned++;
    }
    audio.spawn();
  }

  private updateGame(dt: number): void {
    const p = this.player;
    if (!p) return;
    const move = this.getMoveVector();
    p.moving = move.x !== 0 || move.z !== 0;

    // aim from pointer, or from the mobile aim pad
    if (this.touchAim.active) {
      p.aimX = p.x + this.touchAim.x * 7;
      p.aimZ = p.z + this.touchAim.z * 7;
      const touchAngle = Math.atan2(this.touchAim.x, this.touchAim.z);
      p.angle = angleLerp(p.angle, touchAngle, Math.min(1, dt * 30));
    } else if (document.body.classList.contains('touch')) {
      // no aim pad used yet: face where you run (there is no cursor on touch screens)
      if (p.moving) {
        p.aimX = p.x + move.x * 7;
        p.aimZ = p.z + move.z * 7;
      }
      const aimAngle = Math.atan2(p.aimX - p.x, p.aimZ - p.z);
      p.angle = angleLerp(p.angle, aimAngle, Math.min(1, dt * 22));
    } else {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      if (this.raycaster.ray.intersectPlane(this.aimPlane, this.aimPoint)) {
        p.aimX = clamp(this.aimPoint.x, -this.halfW - 6, this.halfW + 6);
        p.aimZ = clamp(this.aimPoint.z, -this.halfH - 6, this.halfH + 6);
      }
      const aimAngle = Math.atan2(p.aimX - p.x, p.aimZ - p.z);
      p.angle = angleLerp(p.angle, aimAngle, Math.min(1, dt * 22));
    }

    // The world genuinely stops when the player stops; committed hazards below are the exception.
    let baseTarget = p.moving || p.dashTime > 0 ? 1 : 0;
    if (this.slowmo > 0) baseTarget = Math.min(baseTarget, 0.18);
    this.timeScale = damp(this.timeScale, baseTarget, 9, dt);
    if (this.timeScale < 0.005) this.timeScale = 0;
    const simDt = dt * this.timeScale;
    this.levelTime += simDt;
    audio.setIntensity(this.timeScale);

    // cooldowns (real time)
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.parryCd = Math.max(0, p.parryCd - dt);
    p.parryTime = Math.max(0, p.parryTime - dt);
    p.parryRecovery = Math.max(0, p.parryRecovery - dt);
    p.slashCd = Math.max(0, p.slashCd - dt);
    p.slashWindow = Math.max(0, p.slashWindow - dt);
    p.specialCd = Math.max(0, p.specialCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    this.slowmo = Math.max(0, this.slowmo - dt);
    if (this.touchFire) this.tryShoot();

    // movement
    const speed = 4.75;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashX * 13.5;
      p.vz = p.dashZ * 13.5;
      if (p.dashTime <= 0) {
        // dash over: do not keep skating at dash speed while the damping catches up
        const v = capSpeed(p.vx, p.vz, speed * 1.25);
        p.vx = v.x;
        p.vz = v.z;
      }
    } else {
      const recoveryMove = p.parryRecovery > 0 ? 0.75 : 1;
      p.vx = damp(p.vx, move.x * speed * recoveryMove, 14, dt);
      p.vz = damp(p.vz, move.z * speed * recoveryMove, 14, dt);
    }
    this.movePlayer(p, p.vx * dt, p.vz * dt);
    p.avatar.group.position.set(p.x, 0, p.z);
    p.avatar.group.rotation.y = p.angle;
    p.avatar.animate(dt, p.moving, this.timeScale, p.dashTime > 0);

    if (p.dashTime > 0) {
      this.dashGhostTimer -= dt;
      if (this.dashGhostTimer <= 0) {
        this.dashGhostTimer = 0.045;
        this.fx.afterimage(p.x, p.z, p.angle, this.loadout.skin.accent);
      }
    }

    if (p.moving) {
      p.stepAcc += dt;
      const interval = 0.3;
      if (p.stepAcc > interval) {
        p.stepAcc = 0;
        audio.step();
        this.fx.dust(p.x, p.z, 0xbfae8c, 3);
      }
    }

    this.updateEnemies(simDt, dt);
    this.parryNearby();
    this.updateHazards(dt, simDt);
    this.updateBullets(simDt);
    this.updateBarrels(simDt);
    this.updateCoins(dt);
    this.updateAmmoPickups(dt);
    this.updateBoss(simDt, dt);
    this.landscape?.update(simDt, this.timeScale);
    this.separateEnemies();

    if (p.invuln <= 0) {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        // lunging enemies always hurt on contact; the rest only on difficulties with contact damage
        const lunge = e.def.lunge;
        const contactRange = lunge ? lunge.contactRange : e.def.radius + Game.PLAYER_RADIUS;
        if (!this.difficulty.contactDamage && !lunge) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) < contactRange && this.hasLOS(e.x, e.z, p.x, p.z)) {
          this.hitPlayer();
          break;
        }
      }
    }

    this.checkWaveProgress(dt);
    this.checkFragmentPickup();
    this.updateCamera(dt);

    this.hudTimer += dt;
    if (this.hudTimer > 0.08) {
      this.hudTimer = 0;
      this.emitHud();
    }
  }

  private static readonly PLAYER_RADIUS = 0.3;

  /** Resolves the player against solids without moving it (spawn, revive, snapshots). */
  private collidePlayer(p: PlayerState): void {
    resolveCircle(p, Game.PLAYER_RADIUS, this.colliders);
    this.clampPlayerToArena(p);
  }

  /** Moves the player in sub-steps so dashes, lunges and Iai never tunnel through walls. */
  private movePlayer(p: PlayerState, dx: number, dz: number): void {
    moveCircle(p, dx, dz, Game.PLAYER_RADIUS, this.colliders);
    this.clampPlayerToArena(p);
  }

  private clampPlayerToArena(p: PlayerState): void {
    const maxX = this.halfW - 0.5 + 0.18;
    const maxZ = this.halfH - 0.5 + 0.18;
    p.x = clamp(p.x, -maxX, maxX);
    p.z = clamp(p.z, -maxZ, maxZ);
  }

  private moveEnemy(e: Enemy, dx: number, dz: number): void {
    if (dx === 0 && dz === 0) return;
    const r = e.def.radius;
    moveCircle(e, dx, dz, r, this.colliders);
    const maxX = this.halfW - 0.5 - r + 0.2;
    const maxZ = this.halfH - 0.5 - r + 0.2;
    e.x = clamp(e.x, -maxX, maxX);
    e.z = clamp(e.z, -maxZ, maxZ);
  }

  /**
   * Walk toward a goal near the player (the player by default). The arena's
   * flow field picks the route around cover, on every difficulty; without a
   * route (unreachable goal) it falls back to the straight line, sliding along
   * cover instead of grinding into it.
   */
  private seekEnemy(
    e: Enemy,
    dirX: number,
    dirZ: number,
    pace: number,
    simDt: number,
    goalX = this.player?.x,
    goalZ = this.player?.z,
  ): void {
    if (this.nav && goalX !== undefined && goalZ !== undefined) {
      const route = this.nav.direction(this.colliders, e.x, e.z, e.def.radius, goalX, goalZ);
      if (route) {
        dirX = route.x;
        dirZ = route.z;
      }
    }
    const bx = e.x;
    const bz = e.z;
    this.moveEnemy(e, dirX * pace * simDt, dirZ * pace * simDt);
    if (Math.hypot(e.x - bx, e.z - bz) < 1e-4) {
      const side = e.strafeDir;
      this.moveEnemy(e, dirZ * side * pace * 0.85 * simDt, -dirX * side * pace * 0.85 * simDt);
      if (Math.hypot(e.x - bx, e.z - bz) < 1e-4) e.strafeDir *= -1;
    }
  }

  private hasLOS(x0: number, z0: number, x1: number, z1: number, ignore?: Collider): boolean {
    const dx = x1 - x0;
    const dz = z1 - z0;
    for (const c of this.colliders) {
      if (!c.active || c.kind === 'boss' || c === ignore) continue;
      const t = segAABB(x0, z0, dx, dz, c.minX, c.maxX, c.minZ, c.maxZ);
      if (t < 0.999) return false;
    }
    return true;
  }

  private losEnd(x0: number, z0: number, x1: number, z1: number): number {
    const dx = x1 - x0;
    const dz = z1 - z0;
    let best = 1;
    for (const c of this.colliders) {
      if (!c.active || c.kind === 'boss') continue;
      const t = segAABB(x0, z0, dx, dz, c.minX, c.maxX, c.minZ, c.maxZ);
      if (t < best) best = t;
    }
    return best;
  }

  private updateEnemies(simDt: number, realDt: number): void {
    const p = this.player!;
    const level = this.level!;
    const windupMult = (this.loadout.skin.enemyWindupMult ?? 1) * this.difficulty.enemyWindupMult;
    // one flow field toward the player for every enemy (cheap: rebuilt only on change)
    this.nav?.update(this.colliders, p.x, p.z);
    // bullets enemies may sidestep: the player's own and the ones the player parried
    const threats = this.difficulty.enemyDodge
      ? this.bullets.filter((b) => b.alive && b.owner !== 'enemy')
      : NO_THREATS;

    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.avatar.group.position.x = e.x;
      e.avatar.group.position.z = e.z;
      e.avatar.animate(realDt, this.timeScale);
      e.bashRecovery = Math.max(0, e.bashRecovery - realDt);
      // the body clock drives grace, turning and movement ('world' for everyone but the statue)
      const bodyDt = clockDt(e.def.clock ?? 'world', simDt, realDt);
      const cloak = e.def.cloak;
      if (cloak) this.updateCloak(e, cloak, simDt, realDt);
      if (e.grace > 0) {
        e.grace -= bodyDt;
        e.avatar.setCharge(0);
        continue;
      }
      const dx = p.x - e.x;
      const dz = p.z - e.z;
      const dist = Math.hypot(dx, dz) || 1e-6;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      const targetAngle = Math.atan2(dirX, dirZ);
      e.angle = angleLerp(e.angle, targetAngle, Math.min(1, bodyDt * ENEMY_TURN_RATE));
      e.avatar.group.rotation.y = e.angle;
      const see = this.hasLOS(e.x, e.z, p.x, p.z) && dist < e.def.sightRange;
      const lunge = e.def.lunge;

      if (this.updateDodge(e, simDt, threats)) continue;

      // the midboss runs its own state machine (it never uses the shared windup)
      if (e.ronin) {
        this.updateRonin(e, e.ronin, simDt, realDt, dist, dirX, dirZ, targetAngle, see);
        continue;
      }

      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - clockDt(e.windupClock, simDt, realDt));
        e.charge = clamp(1 - e.windup / Math.max(0.01, e.windupMax), 0, 1);
        e.avatar.setCharge(e.charge);
        const laser = e.def.laser;
        if (laser && e.laser && e.laserMat) {
          e.laser.visible = true;
          // The laser tracks the player until `lockAt`, then promises one fixed line.
          if (e.charge < laser.lockAt) e.aimAngle = targetAngle;
          const reach = laser.length;
          const t = this.losEnd(e.x, e.z, e.x + Math.sin(e.aimAngle) * reach, e.z + Math.cos(e.aimAngle) * reach);
          const ex = e.x + Math.sin(e.aimAngle) * reach * t;
          const ez = e.z + Math.cos(e.aimAngle) * reach * t;
          const pos = e.laser.geometry.getAttribute('position') as THREE.BufferAttribute;
          pos.setXYZ(0, e.x, 1.02, e.z);
          pos.setXYZ(1, ex, 0.6, ez);
          pos.needsUpdate = true;
          e.laserMat.opacity = 0.15 + e.charge * 0.8;
        }
        // Common shots and uncommitted melee can be denied by breaking sight.
        if (!see && e.attackKind !== 'mortar') {
          e.windup = 0;
          e.charge = 0;
          e.avatar.setCharge(0);
          if (e.laser) e.laser.visible = false;
          if (e.laserMat) e.laserMat.opacity = 0;
          if (e.attackKind === 'shot') e.fireTimer += LOS_BREAK_DELAY;
          continue;
        }
        if (e.windup <= 0) {
          if (e.attackKind === 'shot') {
            this.enemyFire(e, dist);
            e.burstLeft = e.def.burst - 1;
            e.burstTimer = e.def.burstGap;
          } else if (e.attackKind === 'bash') {
            this.shieldBash(e, dist);
          } else if (e.attackKind === 'lunge' && lunge) {
            e.lungeTime = lunge.duration;
            e.lungeX = Math.sin(e.aimAngle);
            e.lungeZ = Math.cos(e.aimAngle);
            e.lungeCd = lunge.cooldown * this.difficulty.enemyFireMult;
            this.fx.ring(e.x, e.z, 0xff9a1f, 1.1, 0.3);
            audio.slash(true);
          } else if (e.attackKind === 'wards') {
            this.placeWards(e);
          } else if (e.attackKind === 'grab') {
            this.statueGrab(e, dist);
          } else if (e.attackKind === 'strike') {
            this.ninjaStrike(e, dist);
          }
          if (e.laser) e.laser.visible = false;
          if (e.laserMat) e.laserMat.opacity = 0;
          e.fireTimer =
            (e.def.fireEvery / level.fireScale) * this.difficulty.enemyFireMult + Math.random() * ENEMY_FIRE_JITTER;
          e.avatar.setCharge(0);
          e.charge = 0;
        }
        continue;
      }

      if (e.burstLeft > 0) {
        e.burstTimer -= simDt;
        if (e.burstTimer <= 0) {
          this.enemyFire(e, dist);
          e.burstLeft--;
          e.burstTimer = e.def.burstGap;
        }
        continue;
      }

      // movement and attack commitment
      const stalk = e.def.stalk;
      if (stalk) {
        this.updateStalker(e, stalk, bodyDt, dist, dirX, dirZ, targetAngle, see);
        continue;
      }
      const strike = e.def.strike;
      if (strike) {
        this.updateStriker(e, strike, simDt, dist, targetAngle, see);
        continue;
      }

      if (lunge) {
        e.lungeCd = Math.max(0, e.lungeCd - simDt);
        if (e.lungeTime > 0) {
          e.lungeTime -= simDt;
          const step = lunge.speed * this.difficulty.enemySpeedMult * simDt;
          this.moveEnemy(e, e.lungeX * step, e.lungeZ * step);
          if (Math.hypot(e.x - p.x, e.z - p.z) < lunge.contactRange) this.hitPlayer();
          e.avatar.setCharge(1);
        } else if (e.lungeCd <= 0 && dist < lunge.triggerRange) {
          e.attackKind = 'lunge';
          e.windupClock = 'real';
          e.windup = lunge.windup * Math.max(lunge.minWindupMult, this.difficulty.enemyWindupMult);
          e.windupMax = e.windup;
          e.aimAngle = targetAngle;
          e.charge = 0;
          this.fx.ring(e.x, e.z, 0xff9a1f, 1.45, 0.5);
          this.tryEnemySfx();
        } else {
          this.seekEnemy(e, dirX, dirZ, e.def.moveSpeed * this.difficulty.enemySpeedMult, simDt);
          e.avatar.setCharge(e.lungeCd < 0.45 ? 0.5 : 0);
        }
        continue;
      }

      const bash = e.def.bash;
      const reposition = e.def.reposition;
      const kite = e.def.kite;
      if (bash) {
        if (e.bashRecovery <= 0 && dist > bash.holdDistance) {
          const pace = (see ? e.def.moveSpeed : e.def.moveSpeed * bash.blindPaceMult) * this.difficulty.enemySpeedMult;
          this.seekEnemy(e, dirX, dirZ, pace, simDt);
        }
      } else if (reposition) {
        if (!see && dist > reposition.minDistance) {
          this.seekEnemy(e, dirX, dirZ, reposition.speed * this.difficulty.enemySpeedMult, simDt);
        }
      } else if (kite) {
        if (see) {
          const perpX = dirZ;
          const perpZ = -dirX;
          let mx = perpX * e.def.strafe * e.strafeDir;
          let mz = perpZ * e.def.strafe * e.strafeDir;
          if (dist > kite.approachBeyond) {
            mx += dirX * kite.approachSpeed;
            mz += dirZ * kite.approachSpeed;
          } else if (dist < kite.retreatWithin) {
            mx -= dirX * kite.retreatSpeed;
            mz -= dirZ * kite.retreatSpeed;
          }
          mx *= this.difficulty.enemySpeedMult;
          mz *= this.difficulty.enemySpeedMult;
          const beforeX = e.x;
          const beforeZ = e.z;
          this.moveEnemy(e, mx * simDt, mz * simDt);
          if (Math.abs(e.x - beforeX) < 1e-4 && Math.abs(e.z - beforeZ) < 1e-4) e.strafeDir *= -1;
        } else {
          const pace = (dist > kite.seekFar ? kite.seekFarSpeed : kite.seekNearSpeed) * this.difficulty.enemySpeedMult;
          this.seekEnemy(e, dirX, dirZ, pace, simDt);
        }
      }

      e.fireTimer -= simDt;
      if (!see || e.fireTimer > 0 || e.bashRecovery > 0) continue;
      e.aimAngle = targetAngle;
      const mortar = e.def.mortar;
      if (bash && dist < bash.triggerRange) {
        e.attackKind = 'bash';
        e.windupClock = 'real';
        e.windup = bash.windup * Math.max(bash.minWindupMult, this.difficulty.enemyWindupMult);
        e.windupMax = e.windup;
        this.fx.ring(e.x, e.z, 0xff6a3d, 1.8, 0.55);
        this.tryEnemySfx();
      } else if (mortar) {
        e.attackKind = 'mortar';
        e.windupClock = 'real';
        e.windup = e.def.windup * Math.max(mortar.minWindupMult, this.difficulty.enemyWindupMult);
        e.windupMax = e.windup;
        this.createMortarHazard(e);
        this.tryEnemySfx();
      } else if (e.def.wards) {
        e.attackKind = 'wards';
        e.windupClock = 'world';
        e.windup = e.def.windup * windupMult;
        e.windupMax = e.windup;
        this.tryEnemySfx();
      } else {
        e.attackKind = 'shot';
        e.windupClock = 'world';
        e.windup = e.def.windup * windupMult;
        e.windupMax = e.windup;
        if (e.type === 'sniper') this.tryEnemySfx(0.1);
      }
      e.charge = 0;
    }
  }

  private shieldBash(e: Enemy, dist: number): void {
    const p = this.player!;
    const bash = e.def.bash;
    if (!bash) return;
    e.bashRecovery = bash.recovery;
    this.fx.slash(e.x, e.z, e.aimAngle, 0xff6a3d, 1.9, false);
    audio.slash(true);
    this.shake = Math.max(this.shake, 0.2);
    if (dist < bash.hitRange && inCone(e.x, e.z, e.aimAngle, p.x, p.z, bash.halfArc) && this.hasLOS(e.x, e.z, p.x, p.z)) {
      this.hitPlayer();
    }
  }

  /**
   * Statue: its body clock is inverted, so it walks only while the player
   * stands still and freezes the moment they move, mid-step or mid-grab.
   */
  private updateStalker(
    e: Enemy,
    stalk: StalkTuning,
    bodyDt: number,
    dist: number,
    dirX: number,
    dirZ: number,
    targetAngle: number,
    see: boolean,
  ): void {
    e.attackCd = Math.max(0, e.attackCd - bodyDt);
    if (e.attackCd > 0) return;
    if (see && dist < stalk.triggerRange) {
      e.attackKind = 'grab';
      e.windupClock = 'inverted';
      e.windup = stalk.windup * Math.max(stalk.minWindupMult, this.difficulty.enemyWindupMult);
      e.windupMax = e.windup;
      e.aimAngle = targetAngle;
      e.charge = 0;
      this.fx.ring(e.x, e.z, e.def.color, stalk.hitRange, 0.5);
      this.tryEnemySfx();
      return;
    }
    this.seekEnemy(e, dirX, dirZ, stalk.speed * this.difficulty.enemySpeedMult, bodyDt);
    // the eyes glow while it is awake, which is exactly while the player is still
    e.avatar.setCharge(0.35 * (1 - this.timeScale));
  }

  private statueGrab(e: Enemy, dist: number): void {
    const p = this.player!;
    const stalk = e.def.stalk;
    if (!stalk) return;
    e.attackCd = stalk.recovery;
    this.fx.slash(e.x, e.z, e.aimAngle, e.def.color, stalk.hitRange, false);
    audio.slash(true);
    this.shake = Math.max(this.shake, 0.25);
    // an embrace, not a swing: no cone, only reach and sight
    if (dist < stalk.hitRange && this.hasLOS(e.x, e.z, p.x, p.z)) this.hitPlayer();
  }

  /**
   * Ninja: circles to the player's back and strikes in world time. Standing
   * still freezes the strike in plain view; a parry facing it kills the ninja.
   */
  private updateStriker(
    e: Enemy,
    strike: StrikeTuning,
    simDt: number,
    dist: number,
    targetAngle: number,
    see: boolean,
  ): void {
    const p = this.player!;
    e.attackCd = Math.max(0, e.attackCd - simDt);
    if (e.attackCd <= 0 && see && dist < strike.triggerRange) {
      e.attackKind = 'strike';
      e.windupClock = 'world';
      e.windup = strike.windup * Math.max(strike.minWindupMult, this.difficulty.enemyWindupMult);
      e.windupMax = e.windup;
      e.aimAngle = targetAngle;
      e.charge = 0;
      this.fx.ring(e.x, e.z, e.def.color, strike.hitRange, 0.45);
      this.tryEnemySfx();
      return;
    }
    // aim for the point `flankOffset` behind where the player is facing
    const tx = p.x - Math.sin(p.angle) * strike.flankOffset;
    const tz = p.z - Math.cos(p.angle) * strike.flankOffset;
    const gx = tx - e.x;
    const gz = tz - e.z;
    const gd = Math.hypot(gx, gz);
    if (gd > 0.15) this.seekEnemy(e, gx / gd, gz / gd, strike.speed * this.difficulty.enemySpeedMult, simDt, tx, tz);
    e.avatar.setCharge(0);
  }

  private ninjaStrike(e: Enemy, dist: number): void {
    const p = this.player!;
    const strike = e.def.strike;
    if (!strike) return;
    e.attackCd = strike.recovery;
    // a parry facing the blade turns the strike into the ninja's death
    if (p.parryTime > 0 && dist < strike.hitRange + 0.4 && inCone(p.x, p.z, p.angle, e.x, e.z, 1.3)) {
      p.parryTime = 0;
      this.fx.ring(p.x, p.z, 0x2ee6d0, p.parryRadius * 0.9, 0.36);
      this.fx.sparks(e.x, 0.6, e.z, 0x2ee6d0, 10, 5);
      this.shake = Math.max(this.shake, 0.2);
      audio.parry();
      this.focus = Math.min(100, this.focus + 6);
      this.damageEnemy(e, e.hp);
      return;
    }
    this.fx.slash(e.x, e.z, e.aimAngle, e.def.color, strike.hitRange, false);
    audio.slash(true);
    if (
      dist < strike.hitRange &&
      inCone(e.x, e.z, e.aimAngle, p.x, p.z, strike.halfArc) &&
      this.hasLOS(e.x, e.z, p.x, p.z)
    ) {
      this.hitPlayer();
    }
  }

  /**
   * Cloak: fades while the world runs and shows itself when time stops. A
   * strike being charged is always fully visible, so no hit comes unseen.
   */
  private updateCloak(e: Enemy, cloak: CloakTuning, simDt: number, realDt: number): void {
    const striking = e.windup > 0 && e.attackKind === 'strike';
    const target = striking ? 1 : 1 - (1 - cloak.minOpacity) * this.timeScale;
    e.visibility = damp(e.visibility, target, 14, realDt);
    e.avatar.setOpacity(e.visibility);
    if (e.visibility >= cloak.radarAbove || simDt <= 0) return;
    // while hidden it still disturbs the ground: the trail is the clue
    e.trailTimer -= simDt;
    if (e.trailTimer <= 0) {
      e.trailTimer = cloak.trailEvery;
      this.fx.dust(e.x, e.z, 0x9a90a8, 2);
    }
  }

  // ------------------------------------------------------------------ ronin

  private createRoninState(tuning: RoninTuning, color: number, x: number, z: number): RoninState {
    return {
      tuning,
      phase: 1,
      mode: 'stalk',
      attack: null,
      last: null,
      timer: 0,
      timerMax: 0,
      cooldown: byPhase(tuning.attackCooldown[this.difficulty.id], 1),
      aim: 0,
      dashX: 0,
      dashZ: 0,
      volleyLeft: 0,
      marks: this.buildRoninMarks(tuning, color, x, z),
    };
  }

  /**
   * Everything he can do is drawn on the ground before it happens: an aura
   * that always marks him, the heavy cut's sector, the quick cut's lane and
   * one line per shuriken or arrow.
   */
  private buildRoninMarks(t: RoninTuning, color: number, x: number, z: number): RoninMarks {
    const group = new THREE.Group();
    group.position.set(x, 0.05, z);
    const flat = (mat: THREE.MeshBasicMaterial, geo: THREE.BufferGeometry): THREE.Mesh => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };
    const flatMat = (c: number, opacity: number) =>
      new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      });

    const auraMat = flatMat(color, 0.55);
    const aura = flat(auraMat, new THREE.RingGeometry(1.15, 1.32, 48));
    group.add(aura);

    const attackMat = flatMat(0xff4a3a, 0.2);
    // a pivot per shape: rotating the pivot by the aim angle points the shape at +Z → aim
    const heavy = new THREE.Group();
    heavy.add(flat(attackMat, new THREE.CircleGeometry(t.heavy.range, 40, -Math.PI / 2 - t.heavy.halfArc, t.heavy.halfArc * 2)));
    const quickGeo = new THREE.PlaneGeometry(t.quickcut.width, t.quickcut.length);
    quickGeo.translate(0, -t.quickcut.length / 2, 0); // after the -90° tilt it reaches forward
    const quick = new THREE.Group();
    quick.add(flat(attackMat, quickGeo));
    const lanes: THREE.Group[] = [];
    // lanes start where the projectiles leave his hand, not at his centre
    const laneLength = t.shurikenRange + 2;
    const laneGeo = new THREE.PlaneGeometry(0.09, laneLength);
    laneGeo.translate(0, -(laneLength / 2 + t.throwOffset), 0);
    for (let i = 0; i < 5; i++) {
      const lane = new THREE.Group();
      lane.add(flat(attackMat, laneGeo));
      lanes.push(lane);
    }
    for (const g of [heavy, quick, ...lanes]) {
      g.visible = false;
      group.add(g);
    }
    this.gameGroup.add(group);
    return { group, aura, auraMat, heavy, quick, lanes, attackMat };
  }

  private hideRoninAttackMarks(r: RoninState): void {
    r.marks.heavy.visible = false;
    r.marks.quick.visible = false;
    for (const lane of r.marks.lanes) lane.visible = false;
  }

  /** Points `count` lanes in a fan around `aim` (spread 0 = all on the same line). */
  private showRoninLanes(r: RoninState, aim: number, count: number, spread: number): void {
    r.marks.lanes.forEach((lane, i) => {
      lane.visible = i < count;
      lane.rotation.y = aim + (i - (count - 1) / 2) * spread;
    });
  }

  /**
   * The ronin's whole pattern. Attacks charge and land in world time; in
   * phase 2 his walk also creeps forward while the world is stopped.
   */
  private updateRonin(
    e: Enemy,
    r: RoninState,
    simDt: number,
    realDt: number,
    dist: number,
    dirX: number,
    dirZ: number,
    targetAngle: number,
    see: boolean,
  ): void {
    const p = this.player!;
    const t = r.tuning;
    const marks = r.marks;
    marks.group.position.set(e.x, 0.05, e.z);

    // aura: gold in phase 1, red in phase 2, pulsing white while he can be hit
    const auraColor = r.mode === 'recover' ? 0xffffff : r.phase === 2 ? 0xff3b2e : e.def.color;
    marks.auraMat.color.setHex(auraColor);
    marks.auraMat.opacity = r.mode === 'recover' ? 0.55 + Math.sin(this.realTime * 14) * 0.3 : 0.55;

    switch (r.mode) {
      case 'stalk': {
        r.cooldown = Math.max(0, r.cooldown - simDt);
        e.avatar.setCharge(0);
        const stillDt = r.phase === 2 ? Math.max(0, realDt - simDt) : 0;
        if (dist > t.meleeRange * 0.85) {
          const pace = byPhase(t.approachSpeed, r.phase) * this.difficulty.enemySpeedMult;
          // seekEnemy moves pace × dt: pass the distance as dt with a unit pace
          const step = pace * simDt + t.stillCreep * stillDt;
          if (step > 0) this.seekEnemy(e, dirX, dirZ, 1, step);
        }
        if (stillDt > 0) {
          // the general turn runs on world time; the phase-2 creep turns him too
          e.angle = angleLerp(e.angle, targetAngle, Math.min(1, stillDt * 3));
          e.avatar.group.rotation.y = e.angle;
        }
        if (r.cooldown > 0 || !see) break;
        const awaySpeed = p.vx * dirX + p.vz * dirZ; // dir points from him to the player
        const attack = chooseRoninAttack({ dist, phase: r.phase, awaySpeed, last: r.last, roll: Math.random() }, t);
        if (attack) this.startRoninAttack(e, r, attack, targetAngle);
        break;
      }
      case 'windup': {
        r.timer -= simDt;
        // shurikens follow the player while charging; the cuts commit to one direction
        if (r.attack === 'shuriken') {
          r.aim = targetAngle;
          this.showRoninLanes(r, r.aim, byPhase(t.shuriken.count, r.phase), t.shuriken.spread);
        }
        e.angle = r.aim;
        e.avatar.group.rotation.y = e.angle;
        const charge = clamp(1 - r.timer / Math.max(0.01, r.timerMax), 0, 1);
        e.avatar.setCharge(charge);
        marks.attackMat.opacity = 0.14 + charge * 0.5;
        if (!see) {
          // like every other committed attack, breaking line of sight cancels it
          r.mode = 'stalk';
          r.cooldown = 0.4;
          this.hideRoninAttackMarks(r);
          e.avatar.setCharge(0);
          break;
        }
        if (r.timer <= 0) this.releaseRoninAttack(e, r, dist);
        break;
      }
      case 'recover': {
        r.timer -= simDt;
        e.avatar.setCharge(0);
        if (r.timer <= 0) {
          r.mode = 'stalk';
          r.cooldown = this.roninCooldown(r);
        }
        break;
      }
      case 'dash': {
        r.timer -= simDt;
        const speed = t.dash.distance / t.dash.time;
        this.moveEnemy(e, r.dashX * speed * simDt, r.dashZ * speed * simDt);
        if (r.timer <= 0) {
          r.mode = 'volley';
          r.volleyLeft = byPhase(t.arrows.count, r.phase);
          r.timer = byPhase(t.arrows.gap, r.phase);
        }
        break;
      }
      case 'volley': {
        r.timer -= simDt;
        this.showRoninLanes(r, targetAngle, 1, 0);
        marks.attackMat.opacity = 0.45;
        e.angle = targetAngle;
        e.avatar.group.rotation.y = e.angle;
        if (r.timer > 0) break;
        this.fireRoninProjectile(e, 'arrow');
        r.volleyLeft--;
        r.timer = byPhase(t.arrows.gap, r.phase);
        if (r.volleyLeft <= 0) {
          r.mode = 'stalk';
          r.cooldown = this.roninCooldown(r);
          this.hideRoninAttackMarks(r);
        }
        break;
      }
    }
  }

  /** Pause before his next attack: longer on Easy/Difficult, back to back only on Impossible. */
  private roninCooldown(r: RoninState): number {
    return byPhase(r.tuning.attackCooldown[this.difficulty.id], r.phase);
  }

  private startRoninAttack(e: Enemy, r: RoninState, attack: RoninAttack, aim: number): void {
    const t = r.tuning;
    const windupMult = Math.max(0.75, this.difficulty.enemyWindupMult);
    const windup =
      attack === 'heavy'
        ? byPhase(t.heavy.windup, r.phase)
        : attack === 'quickcut'
          ? t.quickcut.windup
          : byPhase(t.shuriken.windup, r.phase);
    r.mode = 'windup';
    r.attack = attack;
    r.aim = aim;
    r.timer = windup * windupMult;
    r.timerMax = r.timer;
    this.hideRoninAttackMarks(r);
    if (attack === 'heavy') {
      r.marks.heavy.visible = true;
      r.marks.heavy.rotation.y = aim;
    } else if (attack === 'quickcut') {
      r.marks.quick.visible = true;
      r.marks.quick.rotation.y = aim;
    } else {
      this.showRoninLanes(r, aim, byPhase(t.shuriken.count, r.phase), t.shuriken.spread);
    }
    this.fx.ring(e.x, e.z, r.phase === 2 ? 0xff3b2e : e.def.color, 1.6, 0.45);
    this.tryEnemySfx();
  }

  /** A parry facing him blocks a sword hit (no damage, a little focus). */
  private parriedRoninCut(e: Enemy): boolean {
    const p = this.player!;
    if (p.parryTime <= 0 || !inCone(p.x, p.z, p.angle, e.x, e.z, 1.3)) return false;
    p.parryTime = 0;
    this.fx.ring(p.x, p.z, 0x2ee6d0, p.parryRadius * 0.9, 0.36);
    this.fx.sparks(p.x, 0.7, p.z, 0xffd76a, 10, 5);
    audio.parry();
    this.focus = Math.min(100, this.focus + 6);
    return true;
  }

  private releaseRoninAttack(e: Enemy, r: RoninState, dist: number): void {
    const p = this.player!;
    const t = r.tuning;
    const attack = r.attack;
    this.hideRoninAttackMarks(r);
    e.avatar.setCharge(0);
    r.last = attack;
    r.attack = null;

    if (attack === 'heavy') {
      this.fx.slash(e.x, e.z, r.aim, e.def.color, t.heavy.range, true);
      audio.slash(true);
      this.shake = Math.max(this.shake, 0.35);
      const inReach =
        dist < t.heavy.range + Game.PLAYER_RADIUS &&
        inCone(e.x, e.z, r.aim, p.x, p.z, t.heavy.halfArc) &&
        this.hasLOS(e.x, e.z, p.x, p.z);
      if (inReach && !this.parriedRoninCut(e)) this.hitPlayer();
      // the slow cut leaves him open: the only window where hits land
      r.mode = 'recover';
      r.timer = byPhase(t.heavy.recovery, r.phase);
      r.timerMax = r.timer;
      return;
    }

    if (attack === 'quickcut') {
      const x0 = e.x;
      const z0 = e.z;
      const dx = Math.sin(r.aim);
      const dz = Math.cos(r.aim);
      this.moveEnemy(e, dx * t.quickcut.length, dz * t.quickcut.length);
      // anything on the path he actually travelled is cut
      const sx = e.x - x0;
      const sz = e.z - z0;
      const len2 = sx * sx + sz * sz || 1e-6;
      const k = clamp(((p.x - x0) * sx + (p.z - z0) * sz) / len2, 0, 1);
      const off = Math.hypot(p.x - (x0 + sx * k), p.z - (z0 + sz * k));
      this.fx.slash(e.x, e.z, r.aim, 0xff3b2e, 1.8, false);
      this.fx.afterimage(x0, z0, r.aim, 0xff3b2e);
      audio.slash(true);
      if (off < t.quickcut.width / 2 + Game.PLAYER_RADIUS && !this.parriedRoninCut(e)) this.hitPlayer();
      r.mode = 'stalk';
      r.cooldown = Math.max(t.quickcut.recovery, this.roninCooldown(r));
      return;
    }

    // shurikens: one fan, every star parryable
    this.fireRoninProjectile(e, 'shuriken');
    r.mode = 'stalk';
    r.cooldown = this.roninCooldown(r);
  }

  private fireRoninProjectile(e: Enemy, kind: 'shuriken' | 'arrow'): void {
    const p = this.player!;
    const r = e.ronin!;
    const t = r.tuning;
    const level = this.level!;
    const bulletMult = level.speedScale * this.difficulty.enemyBulletSpeedMult;
    if (kind === 'arrow') {
      const tx = p.x + p.vx * t.arrows.lead;
      const tz = p.z + p.vz * t.arrows.lead;
      const a = Math.atan2(tx - e.x, tz - e.z);
      const sx = e.x + Math.sin(a) * t.throwOffset;
      const sz = e.z + Math.cos(a) * t.throwOffset;
      this.spawnBullet(sx, sz, a, t.arrows.speed * bulletMult, 'enemy', 0xffe7a8, e.def.color, 1.35, false, e);
      audio.enemyShoot();
      return;
    }
    const count = byPhase(t.shuriken.count, r.phase);
    const speed = byPhase(t.shuriken.speed, r.phase) * bulletMult;
    for (let i = 0; i < count; i++) {
      const a = r.aim + (i - (count - 1) / 2) * t.shuriken.spread;
      const sx = e.x + Math.sin(a) * t.throwOffset;
      const sz = e.z + Math.cos(a) * t.throwOffset;
      this.spawnBullet(sx, sz, a, speed, 'enemy', 0xd8dce8, 0xb8c0d8, 0.8, false, e);
    }
    this.fx.sparks(e.x, 0.8, e.z, 0xd8dce8, 5, 3);
    audio.enemyShoot();
  }

  /**
   * Every damage source ends here for the ronin. Outside the recovery after
   * his heavy cut he blocks it; inside, it costs exactly one hit and throws
   * him back into a dash and an arrow volley.
   */
  private hitRonin(e: Enemy): void {
    const r = e.ronin!;
    if (r.mode !== 'recover') {
      e.avatar.guard();
      this.fx.sparks(e.x, 1.0, e.z, 0xffe08a, 8, 4);
      this.fx.ring(e.x, e.z, 0xffe08a, 0.9, 0.2);
      audio.parry();
      return;
    }
    const next = roninHealthAfterHit(r.phase, e.hp, r.tuning);
    e.avatar.flash();
    this.fx.sparks(e.x, 1.0, e.z, 0xffe3b0, 10, 5);
    audio.impact();
    this.shake = Math.max(this.shake, 0.25);
    if (next.dead) {
      e.hp = 0;
      this.killEnemy(e);
      this.emitHud();
      return;
    }
    if (next.phase !== r.phase) {
      this.fx.shock(e.x, e.z, 0xff3b2e, 3.6);
      this.shake = Math.max(this.shake, 0.6);
      audio.spawn();
    }
    r.phase = next.phase;
    e.hp = next.hp;
    // thrown back: dash away from the player (a little to the side), then arrows
    const p = this.player!;
    let ax = e.x - p.x;
    let az = e.z - p.z;
    const len = Math.hypot(ax, az) || 1;
    ax /= len;
    az /= len;
    const side = Math.random() < 0.5 ? -0.35 : 0.35;
    const dx = ax + az * side;
    const dz = az - ax * side;
    const dl = Math.hypot(dx, dz) || 1;
    r.mode = 'dash';
    r.dashX = dx / dl;
    r.dashZ = dz / dl;
    r.timer = r.tuning.dash.time;
    r.attack = null;
    this.hideRoninAttackMarks(r);
    this.fx.afterimage(e.x, e.z, e.angle, e.def.color);
    this.emitHud();
  }

  /**
   * Impossible only: a short sidestep away from an incoming bullet, in world
   * time (stopping freezes it with the bullet, so a planned shot still has a
   * chance). Never while an attack is charging, bursting or lunging, and never
   * twice in a row. Returns true while the enemy is mid-dodge (skip its AI).
   */
  private updateDodge(e: Enemy, simDt: number, threats: readonly Bullet[]): boolean {
    const dodge = e.def.dodge;
    if (!dodge) return false;
    if (e.dodgeTime > 0) {
      e.dodgeTime -= simDt;
      const step = dodge.speed * simDt;
      this.moveEnemy(e, e.dodgeX * step, e.dodgeZ * step);
      return true;
    }
    e.dodgeCd = Math.max(0, e.dodgeCd - simDt);
    if (threats.length === 0 || e.dodgeCd > 0 || e.windup > 0 || e.burstLeft > 0 || e.lungeTime > 0) return false;
    const side = dodgeDirection(e.x, e.z, e.def.radius, threats, e.strafeDir);
    if (!side) return false;
    e.dodgeX = side.x;
    e.dodgeZ = side.z;
    e.dodgeTime = dodge.time;
    e.dodgeCd = dodge.cooldown;
    this.fx.dust(e.x, e.z, 0xbfae8c, 3);
    return true;
  }

  private createMortarHazard(e: Enemy): void {
    const p = this.player!;
    const mortar = e.def.mortar;
    if (!mortar) return;
    const x = p.x + p.vx * e.def.lead;
    const z = p.z + p.vz * e.def.lead;
    const target = { x, z };
    resolveCircle(target, 0.16, this.colliders);
    this.createHazard('mortar', target.x, target.z, mortar.radius, mortar.fuse, 'real', e);
    this.fx.ring(target.x, target.z, 0xff8a24, mortar.radius, 0.45);
    audio.enemyShoot();
  }

  private placeWards(e: Enemy): void {
    const p = this.player!;
    const wards = e.def.wards;
    if (!wards) return;
    const angle = Math.atan2(p.x - e.x, p.z - e.z);
    for (let i = 1; i <= wards.count; i++) {
      const distance = i * wards.spacing;
      const x = e.x + Math.sin(angle) * distance;
      const z = e.z + Math.cos(angle) * distance;
      if (distance > wards.maxDistance || !this.hasLOS(e.x, e.z, x, z)) break;
      this.createHazard('ward', x, z, wards.radius, wards.fuse, 'world', e);
    }
    audio.enemyShoot();
  }

  private createHazard(
    kind: GroundHazard['kind'],
    x: number,
    z: number,
    radius: number,
    duration: number,
    clock: GroundHazard['clock'],
    owner: Enemy | null,
  ): void {
    const color = kind === 'mortar' ? 0xff6a2c : 0xe8d7a1;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      // flat on the ground: one pass draws both faces (see FLAT_TRANSPARENT in fx.ts)
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.035;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.88, radius, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.045;
    group.add(disc, ring);
    this.gameGroup.add(group);
    this.hazards.push({ kind, x, z, radius, age: 0, duration, clock, armed: kind === 'mortar', active: true, owner, mesh: group, disc, ring });
  }

  private updateHazards(realDt: number, simDt: number): void {
    const p = this.player!;
    for (const h of this.hazards) {
      if (!h.active) continue;
      if (h.kind === 'ward' && !h.armed) {
        if (Math.hypot(p.x - h.x, p.z - h.z) < h.radius * 0.7 && this.hasLOS(h.x, h.z, p.x, p.z)) {
          h.armed = true;
          this.fx.ring(h.x, h.z, 0xe8d7a1, h.radius, 0.25);
          audio.parry();
        }
      }
      if (!h.armed) {
        (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.42 + Math.sin(this.realTime * 5 + h.x) * 0.12;
        continue;
      }
      h.age += clockDt(h.clock, simDt, realDt);
      const t = clamp(h.age / h.duration, 0, 1);
      (h.disc.material as THREE.MeshBasicMaterial).opacity = 0.1 + t * 0.24;
      (h.ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + t * 0.45;
      h.ring.scale.setScalar(0.94 + t * 0.08);
      if (h.age < h.duration) continue;
      h.active = false;
      this.explodeHazard(h);
      this.removeHazard(h);
    }
    if (this.hazards.some((h) => !h.active)) this.hazards = this.hazards.filter((h) => h.active);
  }

  private explodeHazard(h: GroundHazard): void {
    const p = this.player!;
    const color = h.kind === 'mortar' ? 0xff6a2c : 0xe8d7a1;
    this.fx.shock(h.x, h.z, color, h.kind === 'mortar' ? h.radius * 1.8 : h.radius * 1.35);
    this.shake = Math.max(this.shake, h.kind === 'mortar' ? 0.38 : 0.2);
    audio.hit();
    if (Math.hypot(p.x - h.x, p.z - h.z) < h.radius && this.hasLOS(h.x, h.z, p.x, p.z)) this.hitPlayer();
    for (const e of this.enemies) {
      if (!e.alive || Math.hypot(e.x - h.x, e.z - h.z) >= h.radius) continue;
      if (!this.hasLOS(h.x, h.z, e.x, e.z)) continue;
      this.damageEnemy(e, h.kind === 'mortar' ? 2 : 1);
    }
    for (const barrel of this.barrels) {
      if (barrel.alive && Math.hypot(barrel.x - h.x, barrel.z - h.z) < h.radius * 1.25) this.igniteBarrel(barrel);
    }
    for (const rock of this.rocks) {
      if (Math.hypot(rock.x - h.x, rock.z - h.z) < h.radius * 1.15) this.damageRock(rock, 99);
    }
  }

  private destroyHazard(h: GroundHazard): void {
    if (!h.active) return;
    h.active = false;
    this.removeHazard(h);
    this.fx.sparks(h.x, 0.45, h.z, 0xffe4a8, 8, 4);
    this.fx.ring(h.x, h.z, 0xffe4a8, h.radius * 0.7, 0.25);
    this.focus = Math.min(100, this.focus + 2);
  }

  private removeHazard(h: GroundHazard): void {
    this.gameGroup.remove(h.mesh);
    h.disc.geometry.dispose();
    (h.disc.material as THREE.Material).dispose();
    h.ring.geometry.dispose();
    (h.ring.material as THREE.Material).dispose();
  }

  private clearHazards(): void {
    for (const h of this.hazards) if (h.active) this.removeHazard(h);
    this.hazards = [];
  }

  private tryEnemySfx(pitch = 0): void {
    if (this.realTime - this.lastEnemySfx < 0.05) return;
    this.lastEnemySfx = this.realTime;
    audio.enemyShoot();
  }

  private enemyFire(e: Enemy, dist: number): void {
    const p = this.player!;
    const level = this.level!;
    const lead = e.def.lead;
    const tx = p.x + p.vx * lead;
    const tz = p.z + p.vz * lead;
    let angle = e.type === 'sniper' ? e.aimAngle : Math.atan2(tx - e.x, tz - e.z);
    angle += (Math.random() - 0.5) * e.def.spread * 2;
    const speed = e.def.bulletSpeed * level.speedScale * this.difficulty.enemyBulletSpeedMult;
    const sx = e.x + Math.sin(angle) * 0.52;
    const sz = e.z + Math.cos(angle) * 0.52;
    this.spawnBullet(sx, sz, angle, speed, 'enemy', e.def.color, e.def.color, 0.95, false, e);
    this.fx.sparks(sx, 0.55, sz, e.def.color, 3, 2.4);
    this.tryEnemySfx();
    if (e.type === 'sniper' && e.laser) e.laser.visible = false;
  }

  private updateBullets(simDt: number): void {
    const p = this.player!;
    if (!p) return;
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.life -= simDt;
      if (b.life <= 0) {
        this.removeBullet(b);
        continue;
      }
      const x0 = b.x;
      const z0 = b.z;
      const dx = b.vx * simDt;
      const dz = b.vz * simDt;
      if (Math.abs(dx) < 1e-9 && Math.abs(dz) < 1e-9) {
        b.mesh.position.set(b.x, 0.55, b.z);
        continue;
      }
      const x1 = x0 + dx;
      const z1 = z0 + dz;

      // nearest solid
      let wallT = 1;
      let wallHit: Collider | null = null;
      for (const c of this.colliders) {
        if (!c.active || c.kind === 'boss') continue;
        const t = segAABB(x0, z0, dx, dz, c.minX, c.maxX, c.minZ, c.maxZ);
        if (t < wallT) {
          wallT = t;
          wallHit = c;
        }
      }

      // entities before the wall
      let hitSomething = false;
      if (b.owner === 'player' || b.owner === 'parried') {
        for (const h of this.hazards) {
          if (!h.active || h.kind !== 'ward') continue;
          const t = segPointT(x0, z0, dx, dz, h.x, h.z);
          if (t > wallT) continue;
          const hx = x0 + dx * t;
          const hz = z0 + dz * t;
          if (Math.hypot(hx - h.x, hz - h.z) > 0.34) continue;
          this.destroyHazard(h);
          this.removeBullet(b);
          hitSomething = true;
          break;
        }
        if (hitSomething) continue;
        for (const e of this.enemies) {
          if (!e.alive) continue;
          const t = segPointT(x0, z0, dx, dz, e.x, e.z);
          if (t > wallT) continue;
          const px = x0 + dx * t;
          const pz = z0 + dz * t;
          if (Math.hypot(px - e.x, pz - e.z) > e.def.radius + 0.06) continue;
          // stone and the ronin's blade turn bullets away
          if (e.def.stalk || e.ronin) {
            this.deflectBullet(e, b, px, pz);
            hitSomething = true;
            break;
          }
          if (e.type === 'shield') {
            const fwdX = Math.sin(e.angle);
            const fwdZ = Math.cos(e.angle);
            const vlen = Math.hypot(b.vx, b.vz) || 1;
            const dot = (b.vx / vlen) * fwdX + (b.vz / vlen) * fwdZ;
            if (dot < -0.25) {
              this.fx.sparks(px, 0.6, pz, 0xffe08a, 6, 4);
              audio.impact();
              this.removeBullet(b);
              hitSomething = true;
              break;
            }
          }
          this.damageEnemy(e, 1);
          this.removeBullet(b);
          hitSomething = true;
          break;
        }
        if (!hitSomething && this.boss && this.boss.alive) {
          const t = segPointT(x0, z0, dx, dz, this.boss.x, this.boss.z);
          if (t <= wallT) {
            const bx = x0 + dx * t;
            const bz = z0 + dz * t;
            if (Math.hypot(bx - this.boss.x, bz - this.boss.z) < 1.05) {
              this.damageBoss();
              this.removeBullet(b);
              hitSomething = true;
            }
          }
        }
      } else if (b.owner === 'enemy') {
        if (!b.fromBoss) {
          for (const e of this.enemies) {
            if (!e.alive || e === b.fromEnemy) continue;
            const t = segPointT(x0, z0, dx, dz, e.x, e.z);
            if (t > wallT) continue;
            const px = x0 + dx * t;
            const pz = z0 + dz * t;
            if (Math.hypot(px - e.x, pz - e.z) <= e.def.radius + 0.05) {
              if (e.def.stalk || e.ronin) {
                this.deflectBullet(e, b, px, pz);
              } else {
                this.damageEnemy(e, 1);
                this.removeBullet(b);
              }
              hitSomething = true;
              break;
            }
          }
        }
        if (!hitSomething) {
          const t = segPointT(x0, z0, dx, dz, p.x, p.z);
          if (t <= wallT) {
            const px = x0 + dx * t;
            const pz = z0 + dz * t;
            if (Math.hypot(px - p.x, pz - p.z) < 0.34) {
              if (p.invuln <= 0 && !this.tryParryBullet(b, px, pz)) this.hitPlayer();
              this.removeBullet(b);
              hitSomething = true;
            }
          }
        }
      }
      if (hitSomething) continue;

      if (wallHit && wallT < 1) {
        const px = x0 + dx * wallT;
        const pz = z0 + dz * wallT;
        if (wallHit.kind === 'barrel' && wallHit.barrel && wallHit.barrel.alive) {
          this.igniteBarrel(wallHit.barrel);
        } else if (wallHit.kind === 'rock' && wallHit.rock) {
          this.damageRock(wallHit.rock, 1);
        } else {
          this.fx.sparks(px, 0.55, pz, b.owner === 'enemy' ? 0xff6a4d : this.loadout.trail.color, 3, 2.2);
        }
        this.removeBullet(b);
        continue;
      }

      b.x = x1;
      b.z = z1;
      b.mesh.position.set(b.x, 0.55, b.z);
      b.mesh.rotation.y = Math.atan2(b.vx, b.vz);
    }
    // dead bullets used to pile up in the array for the whole level
    if (this.bullets.some((b) => !b.alive)) this.bullets = this.bullets.filter((b) => b.alive);
  }

  /**
   * Bullets that do no damage: stone shoves the statue back a little, the
   * ronin parries with the blade (no push).
   */
  private deflectBullet(e: Enemy, b: Bullet, px: number, pz: number): void {
    const push = e.def.stalk?.bulletPush ?? 0;
    if (push > 0) {
      const vlen = Math.hypot(b.vx, b.vz) || 1;
      this.moveEnemy(e, (b.vx / vlen) * push, (b.vz / vlen) * push);
    }
    if (e.ronin) {
      e.avatar.guard();
      this.fx.sparks(px, 0.9, pz, 0xffe08a, 8, 4);
      audio.parry();
    } else {
      this.fx.sparks(px, 0.6, pz, 0xd8d4c8, 6, 4);
      audio.impact();
    }
    this.removeBullet(b);
  }

  private removeBullet(b: Bullet): void {
    b.alive = false;
    // geometry and materials are shared (see makeBulletMesh): only leave the scene
    this.gameGroup.remove(b.mesh);
  }

  private damageEnemy(e: Enemy, amount: number): void {
    if (!e.alive || amount <= 0) return;
    // the midboss counts hits, not damage, and blocks outside its opening
    if (e.ronin) {
      this.hitRonin(e);
      return;
    }
    e.hp = Math.max(0, e.hp - amount);
    if (e.hp <= 0) {
      this.killEnemy(e);
      return;
    }
    e.avatar.flash();
    this.fx.sparks(e.x, 0.62, e.z, 0xffe3b0, 4, 3);
    this.fx.ring(e.x, e.z, e.def.color, 0.65, 0.22);
    audio.impact();
    this.shake = Math.max(this.shake, 0.08);
  }

  private killEnemy(e: Enemy): void {
    if (!e.alive) return;
    e.alive = false;
    e.avatar.group.visible = false;
    this.fx.debris(e.x, 0.5, e.z, e.def.color, 11, 4.2, 0.1);
    this.fx.sparks(e.x, 0.6, e.z, 0xffe3b0, 6, 4);
    this.fx.ring(e.x, e.z, e.def.color, 1.2, 0.4);
    audio.kill();
    this.shake = Math.max(this.shake, 0.16);
    this.kills++;
    if (this.slowmo <= 0) this.focus = Math.min(100, this.focus + 14);
    this.removeEnemyExtras(e);
    if (!this.level?.noAmmoDrops && (Math.random() < 0.34 * this.difficulty.ammoDropMult || e.type === 'shield' || e.type === 'mortar' || e.type === 'warden' || this.level?.boss)) {
      this.dropAmmo(e.x, e.z);
    }
  }

  /** Things an enemy owns outside its avatar: the sniper laser, the ronin's ground marks. */
  private removeEnemyExtras(e: Enemy): void {
    if (e.ronin) e.ronin.marks.group.visible = false;
    if (!e.laser) return;
    e.laser.visible = false;
    this.gameGroup.remove(e.laser);
    e.laser.geometry.dispose();
    e.laserMat?.dispose();
    e.laser = null;
  }

  private hitPlayer(): void {
    const p = this.player;
    if (!p || this.state !== 'playing' || p.invuln > 0) return;
    this.events.onPlayerHit();
    if (this.sandbox?.invulnerable) {
      // show the hit, take nothing: lets you watch an enemy's whole pattern
      p.invuln = 0.35;
      this.fx.shock(p.x, p.z, 0xff3b2e, 1.4);
      audio.hit();
      return;
    }
    if (p.hp > 1) {
      p.hp -= 1;
      p.invuln = this.difficulty.invulnTime;
      this.shake = Math.max(this.shake, 0.42);
      this.fx.shock(p.x, p.z, 0xff3b2e, 1.8);
      audio.hit();
      this.emitHud();
      return;
    }
    p.hp = 0;
    p.avatar.group.visible = false;
    this.state = 'dying';
    this.stateTimer = 0.95;
    this.deaths++;
    this.shake = 1.1;
    this.fx.shock(p.x, p.z, 0xff3b2e, 3.2);
    this.fx.debris(p.x, 0.6, p.z, this.loadout.skin.accent, 16, 4.5, 0.1);
    audio.lose();
    this.clearEnemyBulletsNear(p.x, p.z, 8);
    this.emitHud();
  }

  private clearEnemyBulletsNear(x: number, z: number, r: number): void {
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      if (Math.hypot(b.x - x, b.z - z) < r) this.removeBullet(b);
    }
  }

  private clearBullets(): void {
    for (const b of this.bullets) if (b.alive) this.removeBullet(b);
    this.bullets = [];
  }

  private updateBoss(simDt: number, dt: number): void {
    const boss = this.boss;
    if (!boss || !boss.alive) return;
    const p = this.player!;
    boss.avatar.animate(dt, this.timeScale);
    boss.avatar.group.position.x = boss.x;
    boss.avatar.group.position.z = boss.z;
    const target = Math.atan2(p.x - boss.x, p.z - boss.z);
    boss.angle = angleLerp(boss.angle, target, Math.min(1, simDt * 1.5));
    boss.avatar.group.rotation.y = boss.angle;

    if (boss.windup > 0) {
      boss.windup -= dt;
      boss.avatar.setCharge(clamp(1 - boss.windup / 0.85, 0, 1));
      if (boss.windup <= 0) {
        this.bossFire(boss);
        boss.avatar.setCharge(0);
        boss.cooldown = boss.phase === 1 ? 2.9 : boss.phase === 2 ? 2.4 : 1.85;
      }
      return;
    }

    boss.cooldown -= dt;
    if (boss.cooldown <= 0) {
      boss.windup = 0.85;
      this.fx.ring(boss.x, boss.z, 0xff3b2e, 2.4, 0.5);
    }
  }

  private bossFire(boss: Boss): void {
    const p = this.player!;
    const phase = boss.phase;
    const radialCount = phase === 1 ? 12 : phase === 2 ? 16 : 20;
    const radialSpeed = phase === 1 ? 4.1 : phase === 2 ? 4.5 : 4.9;
    const offset = Math.random() * Math.PI * 2;
    const parryable = phase === 1;
    for (let i = 0; i < radialCount; i++) {
      const a = offset + (i / radialCount) * Math.PI * 2;
      const sx = boss.x + Math.sin(a) * 1.25;
      const sz = boss.z + Math.cos(a) * 1.25;
      this.spawnBullet(sx, sz, a, radialSpeed, 'enemy', parryable ? 0xff3b2e : 0xff8a24, parryable ? 0xff5a3c : 0xffb347, parryable ? 1.05 : 1.3, true, null, parryable);
    }
    const aimed = phase === 1 ? 3 : phase === 2 ? 4 : 5;
    const baseAngle = Math.atan2(p.x - boss.x, p.z - boss.z);
    for (let i = 0; i < aimed; i++) {
      const spread = (i - (aimed - 1) / 2) * 0.14;
      const a = baseAngle + spread;
      const sx = boss.x + Math.sin(a) * 1.15;
      const sz = boss.z + Math.cos(a) * 1.15;
      this.spawnBullet(sx, sz, a, 7.6, 'enemy', parryable ? 0xff2e46 : 0xff8a24, parryable ? 0xff2e46 : 0xffb347, parryable ? 1.1 : 1.3, true, null, parryable);
    }
    this.fx.sparks(boss.x, 2.6, boss.z, 0xffb02e, 22, 7);
    this.fx.ring(boss.x, boss.z, 0xffb02e, 2.6, 0.45);
    this.shake = Math.max(this.shake, 0.35);
    audio.hit();
    if (phase >= 2 && boss.addsSpawned < 2) {
      this.spawnBossAdds(2);
    }
  }

  private damageBoss(): void {
    const boss = this.boss;
    if (!boss || !boss.alive) return;
    boss.hp -= 1;
    boss.avatar.flash();
    this.fx.sparks(boss.x, 1.8, boss.z, 0xffd76a, 8, 5);
    audio.impact();
    this.shake = Math.max(this.shake, 0.12);
    const ratio = boss.hp / boss.maxHp;
    const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
    if (nextPhase > boss.phase) {
      boss.phase = nextPhase;
      this.fx.shock(boss.x, boss.z, 0xff3b2e, 3.4);
      this.shake = Math.max(this.shake, 0.6);
      audio.spawn();
    }
    if (boss.hp <= 0) {
      boss.alive = false;
      boss.collider.active = false;
      boss.avatar.group.visible = false;
      this.fx.shock(boss.x, boss.z, 0xff3b2e, 5);
      this.fx.debris(boss.x, 1.4, boss.z, 0xffb02e, 30, 7, 0.14);
      this.fx.confetti(boss.x, boss.z);
      this.shake = 1.25;
      this.completeLevel();
    }
    this.emitHud();
  }

  private updateBarrels(simDt: number): void {
    for (const b of this.barrels) {
      if (!b.alive || b.fuse < 0) continue;
      b.fuse -= simDt;
      if (b.fuse <= 0) this.explodeBarrel(b);
    }
  }

  private igniteBarrel(b: Barrel): void {
    if (!b.alive || b.fuse >= 0) return;
    b.fuse = 0.22;
    this.fx.sparks(b.x, 0.75, b.z, 0xffb02e, 8, 4);
    audio.impact();
  }

  private explodeBarrel(b: Barrel): void {
    if (!b.alive) return;
    b.alive = false;
    b.mesh.visible = false;
    b.collider.active = false;
    this.fx.shock(b.x, b.z, 0xff7a1a, 2.8);
    this.fx.debris(b.x, 0.6, b.z, 0xffb02e, 18, 6, 0.13);
    audio.kill();
    this.shake = Math.max(this.shake, 0.55);
    const radius = 2.05;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.x - b.x, e.z - b.z) <= radius && this.hasLOS(b.x, b.z, e.x, e.z, b.collider)) this.killEnemy(e);
    }
    if (this.player && this.player.invuln <= 0) {
      if (Math.hypot(this.player.x - b.x, this.player.z - b.z) <= radius * 0.92 && this.hasLOS(b.x, b.z, this.player.x, this.player.z, b.collider)) this.hitPlayer();
    }
    for (const other of this.barrels) {
      if (other.alive && other !== b && Math.hypot(other.x - b.x, other.z - b.z) <= radius + 0.4) {
        other.fuse = other.fuse < 0 ? 0.16 : Math.min(other.fuse, 0.16);
      }
    }
  }

  private updateCoins(dt: number): void {
    for (const c of this.coins) {
      if (c.taken) continue;
      c.phase += dt;
      c.mesh.rotation.y += dt * 2.1;
      c.mesh.position.y = 0.55 + Math.sin(c.phase * 2.3) * 0.08;
    }
  }

  private checkFragmentPickup(): void {
    const p = this.player!;
    for (const c of this.coins) {
      if (c.taken) continue;
      if (Math.hypot(c.x - p.x, c.z - p.z) < 0.62) {
        c.taken = true;
        c.mesh.visible = false;
        this.fragments++;
        this.fx.sparks(c.x, 0.6, c.z, 0xf2b51c, 8, 4);
        this.fx.ring(c.x, c.z, 0xf2b51c, 0.9, 0.35);
        audio.coin();
        this.emitHud();
      }
    }
  }

  private dropAmmo(x: number, z: number): void {
    // only pickups still on the floor count; collected ones used to stay in the list
    // and silently shut off every ammo drop after the 13th of a level
    this.ammoPickups = this.ammoPickups.filter((a) => !a.taken);
    if (liveCount(this.ammoPickups) > 12) return;
    const mesh = makeAmmoMesh();
    mesh.position.set(x, 0.35, z);
    this.gameGroup.add(mesh);
    this.ammoPickups.push({ mesh, x, z, taken: false, phase: Math.random() * 6 });
  }

  private updateAmmoPickups(dt: number): void {
    const p = this.player!;
    for (const a of this.ammoPickups) {
      if (a.taken) continue;
      a.phase += dt;
      a.mesh.rotation.y += dt * 2.4;
      a.mesh.position.y = 0.32 + Math.sin(a.phase * 2.7) * 0.06;
      if (Math.hypot(a.x - p.x, a.z - p.z) < 0.6) {
        a.taken = true;
        a.mesh.visible = false;
        this.gameGroup.remove(a.mesh);
        a.mesh.geometry.dispose();
        (a.mesh.material as THREE.Material).dispose();
        p.ammo = Math.min(16, p.ammo + 1);
        this.fx.sparks(a.x, 0.5, a.z, 0xf2b51c, 5, 3);
        audio.coin();
        this.emitHud();
      }
    }
  }

  private separateEnemies(): void {
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        const min = a.def.radius + b.def.radius + 0.05;
        if (d > 1e-5 && d < min) {
          const push = ((min - d) / 2) * 0.7;
          a.x -= (dx / d) * push;
          a.z -= (dz / d) * push;
          b.x += (dx / d) * push;
          b.z += (dz / d) * push;
        }
      }
    }
  }

  private checkWaveProgress(dt: number): void {
    if (!this.level || this.state !== 'playing') return;
    // the sandbox has no waves and is never "won"
    if (this.sandbox) return;
    if (this.boss) {
      // covers a boss killed on the very frame the player died, then revived
      if (!this.boss.alive || this.boss.hp <= 0) this.completeLevel();
      return;
    }
    const alive = this.enemies.filter((e) => e.alive).length;
    if (alive > 0) {
      this.nextWaveTimer = -1;
      return;
    }
    if (this.completionPending) return;
    if (this.waveIndex < this.level.waves.length - 1) {
      if (this.nextWaveTimer < 0) {
        this.nextWaveTimer = 1.05;
      } else {
        this.nextWaveTimer -= dt;
        if (this.nextWaveTimer <= 0) {
          this.spawnWave(this.waveIndex + 1);
        }
      }
    } else {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    // the sandbox is never won, not even by killing the final boss there
    if (this.sandbox) return;
    if (this.completionPending) return;
    // a hit and the last kill can land in the same frame; dying wins, never "dead and won"
    if (this.state !== 'playing') return;
    this.completionPending = true;
    this.state = 'won';
    this.stateTimer = 1.25;
    this.fx.confetti(this.player?.x ?? 0, this.player?.z ?? 0);
    this.shake = Math.max(this.shake, 0.5);
    audio.win();
    this.emitHud();
  }

  private updateCamera(dt: number): void {
    if (this.mode === 'menu') {
      this.menuAngle += dt * 0.1;
      const r = 11.5;
      const h = 7.4;
      const target = new THREE.Vector3(Math.sin(this.menuAngle) * r, h, Math.cos(this.menuAngle) * r);
      this.camera.position.lerp(target, 1 - Math.exp(-dt * 3));
      this.camera.lookAt(0, 0.9, 0);
      return;
    }
    const p = this.player;
    if (!p) return;
    const aspect = this.camera.aspect;
    const fit = aspect >= 1.25 ? 1 : Math.min(1.55, 1.3 / Math.max(0.6, aspect));
    const ahead = 0.08;
    const baseX = p.x + (p.aimX - p.x) * ahead;
    const baseZ = p.z;
    const wanted = new THREE.Vector3(baseX, 7.15 * fit, baseZ + 9.9 * fit);
    const look = new THREE.Vector3(baseX, 2.0, baseZ - 4.2);
    if (this.camSnap) {
      this.camera.position.copy(wanted);
      this.camLook.copy(look);
      this.camSnap = false;
    } else {
      const k = 1 - Math.exp(-dt * 4.2);
      this.camera.position.lerp(wanted, k);
      this.camLook.lerp(look, k);
    }
    this.dir.position.set(p.x - 10, 18, p.z + 13);
    this.dir.target.position.set(p.x, 0, p.z);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    const s = this.shake * this.shake;
    this.shakeOffset.set((Math.random() - 0.5) * s * 1.6, (Math.random() - 0.5) * s * 1.2, (Math.random() - 0.5) * s * 1.6);
    this.camera.position.add(this.shakeOffset);
    this.camera.lookAt(this.camLook.x + this.shakeOffset.x * 0.4, this.camLook.y, this.camLook.z + this.shakeOffset.z * 0.4);
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (!this.frameDue(now)) return;
    const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
    this.lastFrame = now;
    this.realTime += dt;
    if (!this.qualityChecked && this.mode === 'game' && this.state === 'playing') {
      this.sampleTime += dt;
      this.sampleFrames++;
      if (this.sampleTime > 2.4) {
        this.qualityChecked = true;
        const avg = this.sampleTime / Math.max(1, this.sampleFrames);
        if (!this.lowQuality && avg > 0.029) this.degradeQuality();
      }
    }

    if (this.mode === 'menu') {
      this.updateMenuCamera(dt);
      this.menuLandscape?.update(dt * 0.55);
      this.fx.update(dt);
    } else if (this.mode === 'duel') {
      this.updateDuel(dt);
    } else {
      if (this.state === 'playing') {
        this.updateGame(dt);
        this.fx.update(dt);
      } else if (this.state === 'dying') {
        this.stateTimer -= dt;
        this.updateCamera(dt);
        if (this.stateTimer <= 0) {
          this.state = 'dead';
          // the sandbox never shows the death screen; you just get back up
          if (this.sandbox) this.revive();
          else this.emitDeath();
        }
        this.fx.update(dt);
      } else if (this.state === 'won') {
        this.stateTimer -= dt;
        this.updateCamera(dt);
        if (this.stateTimer <= 0 && this.state === 'won') {
          this.emitWin();
          this.state = 'won';
        }
        this.fx.update(dt);
      } else {
        this.updateCamera(dt);
        if (this.state !== 'paused') this.fx.update(dt);
      }
    }

    if (!this.shouldRender()) return;
    if (this.lowQuality) {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
  };

  /** Power saving: play at SAVING_FPS instead of PLAY_FPS. */
  private economy = false;
  /** When the next frame may run, for the frame-rate cap. */
  private nextFrameAt = 0;

  setEconomy(on: boolean): void {
    this.economy = on === true;
    this.nextFrameAt = 0;
  }

  /**
   * Frame-rate cap (rules in pacing.ts). Most of a frame's cost is fixed
   * (compositing and presenting the canvas), so a 120/144 Hz display drawing
   * every refresh cost 2-2.4x a 60 Hz one for no gameplay gain.
   */
  private frameDue(now: number): boolean {
    const fps = this.mode === 'menu' || this.economy ? SAVING_FPS : PLAY_FPS;
    const slot = frameSlot(now, this.nextFrameAt, fps);
    this.nextFrameAt = slot.next;
    return slot.due;
  }

  /** Frames still to draw after the scene went still (camera settling, last effects). */
  private settleFrames = SETTLE_FRAMES;
  private lastRenderedState: GameState | null = null;
  private lastRenderedMode: 'menu' | 'game' | 'duel' | null = null;

  /** Forces the next frames to draw, e.g. after a resize cleared the canvas. */
  private wake(): void {
    this.settleFrames = SETTLE_FRAMES;
  }

  /**
   * Campaign screens that sit over a frozen scene (pause, briefing, death, win)
   * stop redrawing once nothing moves: no effects alive, no shake, and about a
   * second for the camera to settle. Playing, dying, the duel and the menu
   * always draw. Any state or mode change draws again.
   */
  private shouldRender(): boolean {
    if (this.state !== this.lastRenderedState || this.mode !== this.lastRenderedMode) {
      this.lastRenderedState = this.state;
      this.lastRenderedMode = this.mode;
      this.wake();
    }
    const still =
      this.mode === 'game' &&
      STILL_STATES.has(this.state) &&
      this.shake <= 0 &&
      // a paused scene keeps its effects frozen in place, so they do not count as motion
      (this.state === 'paused' || this.fx.isIdle());
    if (!still) {
      this.wake();
      return true;
    }
    if (this.settleFrames <= 0) return false;
    this.settleFrames--;
    return true;
  }

  private winSent = false;
  private deathSent = false;

  private emitWin(): void {
    if (this.winSent || !this.level) return;
    this.winSent = true;
    this.events.onWin({
      level: this.levelIndex + 1,
      time: this.levelTime,
      fragments: this.fragments,
      fragmentsTotal: this.fragmentsTotal,
      kills: this.kills,
      deaths: this.deaths,
    });
  }

  private emitDeath(): void {
    if (this.deathSent || !this.level) return;
    this.deathSent = true;
    this.events.onDeath({
      level: this.levelIndex + 1,
      time: this.levelTime,
      fragments: this.fragments,
      fragmentsTotal: this.fragmentsTotal,
      kills: this.kills,
      deaths: this.deaths,
    });
  }

  private emitHud(): void {
    const p = this.player;
    if (!p) return;
    const radar: RadarBlip[] = [
      ...this.enemies
        // a cloaked enemy only shows on the radar when it shows in the world
        .filter((e) => e.alive && e.visibility >= (e.def.cloak?.radarAbove ?? 0))
        .map((e) => ({ x: e.x, z: e.z, kind: e.ronin ? ('boss' as const) : ('enemy' as const) })),
      ...this.coins.filter((c) => !c.taken).map((c) => ({ x: c.x, z: c.z, kind: 'coin' as const })),
    ];
    if (this.boss?.alive) radar.push({ x: this.boss.x, z: this.boss.z, kind: 'boss' });
    const bar = this.bossBar();
    this.events.onHud({
      ammo: p.ammo,
      radar,
      playerX: p.x,
      playerZ: p.z,
      playerAngle: p.angle,
      enemies: this.enemies.filter((e) => e.alive).length + (this.boss?.alive ? 1 : 0),
      wave: this.waveIndex + 1,
      waves: this.level ? totalWaves(this.level) : 1,
      fragments: this.fragments,
      fragmentsTotal: this.fragmentsTotal,
      time: this.levelTime,
      timeScale: this.timeScale,
      hp: p.hp,
      maxHp: p.maxHp,
      dash: p.dashMax > 0 ? 1 - p.dashCd / p.dashMax : 1,
      parry: p.parryMax > 0 ? 1 - p.parryCd / p.parryMax : 1,
      unarmed: p.ammo <= 0 && (this.level?.ammo ?? 0) === 0,
      focus: this.focus,
      bossHp: bar.hp,
      bossMax: bar.max,
      bossName: bar.name,
    });
  }

  /**
   * The top bar: the final boss when there is one (as before), otherwise a
   * living ronin, whose two phases read as one bar of 2 × hpPerPhase hits.
   */
  private bossBar(): { hp: number; max: number; name: string } {
    if (this.boss) {
      return {
        hp: this.boss.alive ? this.boss.hp : 0,
        max: this.boss.maxHp,
        name: this.level?.bossName || 'O Relojoeiro',
      };
    }
    const ronin = this.enemies.find((e) => e.alive && e.ronin);
    if (ronin?.ronin) {
      const r = ronin.ronin;
      const per = r.tuning.hpPerPhase;
      return {
        hp: ronin.hp + (r.phase === 1 ? per : 0),
        max: per * 2,
        name: `Ronin · ${r.phase === 1 ? 'I' : 'II'}`,
      };
    }
    return { hp: 0, max: 0, name: '' };
  }

  private buildMenu(): void {
    this.menuDirty = false;
    this.menuLandscape?.dispose();
    this.menuLandscape = null;
    this.disposeGroup(this.menuGroup);
    const theme = this.loadout.theme;

    const miniGrid = [
      '#########',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#.......#',
      '#########',
    ];
    this.menuLandscape = buildLandscape({
      grid: miniGrid,
      halfW: 4,
      halfH: 4,
      biome: getBiome(1),
      theme,
      seed: 41,
      menu: true,
    });
    this.menuGroup.add(this.menuLandscape.group);

    // A single silhouette in the foreground; the valley completes the title shot.
    const avatar = new PlayerAvatar(this.loadout.skin);
    avatar.group.position.set(3, 0, 2.05);
    avatar.group.rotation.y = -0.45;
    avatar.group.scale.setScalar(1.65);
    this.menuGroup.add(avatar.group);
    avatar.animate(0.016, false, 0.2);

    this.updateMenuCamera();
  }

  private updateMenuCamera(dt?: number): void {
    this.menuAngle = this.reduceMenuMotion ? 0 : Math.sin(this.realTime * 0.11) * 0.48;
    const narrow = this.camera.aspect < 0.91;
    const target = new THREE.Vector3((narrow ? 2.9 : 0.55) + this.menuAngle, 3.5, 9.1);
    if (dt === undefined) this.camera.position.copy(target);
    else this.camera.position.lerp(target, 1 - Math.exp(-dt * 3));
    this.camera.lookAt(narrow ? 2.8 : -1.15, 1.65, -2.6);
    this.dir.position.set(-12, 18, 12);
    this.dir.target.position.set(0, 0, 0);
  }

  private disposeLevel(): void {
    this.releaseInputs();
    this.duelActive = false;
    this.duelLocalId = '';
    this.duelSnapshot = null;
    this.duelRemote = null;
    this.clearDuelBullets();
    this.clearBullets();
    this.bullets = [];
    this.coins = [];
    this.ammoPickups = [];
    this.barrels = [];
    this.rocks = [];
    this.clearHazards();
    this.enemies = [];
    this.colliders = [];
    this.nav = null;
    this.boss = null;
    this.player = null;
    this.level = null;
    this.fx.clear();
    this.landscape?.dispose();
    this.landscape = null;
    this.disposeGroup(this.gameGroup);
    this.winSent = false;
    this.deathSent = false;
    this.completionPending = false;
  }

  private disposeGroup(group: THREE.Group): void {
    const toRemove: THREE.Object3D[] = [];
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          m.dispose();
        }
      }
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        (obj.material as THREE.Material).dispose();
      }
    });
    while (group.children.length) {
      toRemove.push(group.children[0]);
      group.remove(group.children[0]);
    }
    toRemove.length = 0;
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resizeHandler);
    window.visualViewport?.removeEventListener('resize', this.resizeHandler);
    this.disposeLevel();
    this.menuLandscape?.dispose();
    this.menuLandscape = null;
    this.disposeGroup(this.menuGroup);
    this.renderer.dispose();
  }
}
