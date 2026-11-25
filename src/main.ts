import './style.css';
import { Game, type GameResult, type Loadout } from './game/game';
import { UI, type DeathView, type UIActions, type WinView } from './ui/ui';
import { loadSave, persist } from './game/save';
import { findItem, findPack, findSkin, findTheme, findTrail, REVIVE_COST, REVIVE_COST_STEP } from './game/catalog';
import { LEVELS } from './game/levels';
import { isDifficulty, type Difficulty } from './game/difficulty';
import { audio } from './game/audio';
import { purchasePack } from './game/payments';
import { DuelClient, type DuelEndInfo } from './multiplayer/duel-client';
import { DuelInput } from './multiplayer/duel-input';
import { OnlineUI } from './ui/online';
import type { DuelSnapshot } from './shared/duel';

try {
  await document.fonts.load('700 120px "Noto Serif JP"');
} catch {
  /* banner textures fall back to system serif */
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const uiRoot = document.getElementById('ui') as HTMLElement;
const onlineRoot = document.getElementById('online-ui') as HTMLElement;

const save = loadSave();
let reviveCount = 0;
let currentLevelId = 1;
let lastDeath: DeathView | null = null;
let lastWin: WinView | null = null;
let onlineUI: OnlineUI;
let duelClient: DuelClient | null = null;
let duelInput: DuelInput | null = null;
let duelActive = false;
let duelResultShown = false;
let duelGeneration = 0;
let lastRoomCode: string | null = null;
let duelLocalId = '';
let lastDuelScore: [number, number] = [0, 0];
let lastQueueAt = 0;

function buildLoadout(): Loadout {
  return {
    skin: findSkin(save.skin),
    theme: findTheme(save.theme),
    trail: findTrail(save.trail),
    upgrades: save.owned.filter((id) => id.startsWith('up-')),
    difficulty: save.difficulty,
  };
}

function setDifficulty(value: Difficulty): void {
  if (!isDifficulty(value) || value === save.difficulty) return;
  save.difficulty = value;
  persist(save);
  game.setLoadout(buildLoadout());
  if (game.getState() === 'briefing') {
    game.startLevel(game.getLevelIndex(), false);
  }
}

async function toggleFullscreen(): Promise<void> {
  const root = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
  };
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  try {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else doc.webkitExitFullscreen?.();
      return;
    }
    if (!root.requestFullscreen && isIOS) {
      ui.toast('No iPhone, adicione à Tela de Início e abra por lá para jogar em tela cheia.', true);
      return;
    }
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    else {
      ui.toast('Use o menu do navegador para ativar tela cheia e gire o celular.', true);
      return;
    }

    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };
    try {
      await orientation.lock?.('landscape');
    } catch {
      /* iOS and some browsers do not expose orientation locking. */
    }
  } catch {
    ui.toast('Não foi possível ativar a tela cheia. Use o menu do navegador e gire o celular.', true);
  }
}

function syncFullscreenButton(): void {
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  const full = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
  document.querySelectorAll<HTMLElement>('[data-touch="fullscreen"]').forEach((button) => {
    button.setAttribute('aria-label', full ? 'Sair da tela cheia' : 'Tela cheia');
    button.classList.toggle('is-full', full);
  });
}

document.addEventListener('fullscreenchange', syncFullscreenButton);
document.addEventListener('webkitfullscreenchange', syncFullscreenButton);

let ui!: UI;
let game!: Game;

game = new Game(
  canvas,
  {
    onHud: (hud) => ui?.updateHud(hud),
    onLevelReady: (info) => {
      currentLevelId = info.level.id;
      reviveCount = 0;
      ui.setLevel(info.level.id);
      ui.showBriefing(info);
    },
    onWave: (wave, waves, boss) => {
      if (boss) ui.toast('Chefe · O Relojoeiro', true);
      else if (wave > 1) ui.toast(`Onda ${wave}/${waves}`);
    },
    onWin: (result) => handleWin(result),
    onDeath: (result) => handleDeath(result),
    onPlayerHit: () => ui.flashHit(),
    onSpecial: () => ui.flashSpecial(),
  },
  buildLoadout(),
);

const actions: UIActions = {
  play: () => startNextLevel(),
  menu: () => {
    game.showMenu();
    ui.showMenu();
  },
  selectLevel: (index) => {
    if (index < 0 || index >= LEVELS.length) return;
    if (index >= save.unlocked) return;
    startLevel(index);
  },
  begin: () => {
    game.beginPlay();
    ui.showHUD();
  },
  setDifficulty: (difficulty) => setDifficulty(difficulty),
  pause: () => {
    if (game.getState() !== 'playing' && game.getState() !== 'briefing') return;
    game.pause();
    ui.showPause();
  },
  resume: () => {
    game.resume();
    ui.showHUD();
  },
  restart: () => {
    reviveCount = 0;
    const idx = game.getLevelIndex();
    ui.setLevel(LEVELS[idx].id);
    ui.showHUD();
    game.startLevel(idx, true);
  },
  quitToMenu: () => {
    game.showMenu();
    ui.showMenu();
  },
  nextLevel: () => {
    if (lastWin && lastWin.nextIndex !== null) {
      startLevel(lastWin.nextIndex);
    } else {
      ui.showLevels();
    }
  },
  retry: () => {
    reviveCount = 0;
    const idx = game.getLevelIndex();
    ui.setLevel(LEVELS[idx].id);
    ui.showHUD();
    game.startLevel(idx, true);
  },
  revive: () => doRevive(),
  reviveShop: () => {
    const cost = REVIVE_COST + reviveCount * REVIVE_COST_STEP;
    const missing = Math.max(0, cost - save.coins);
    ui.showShop('moedas');
    ui.toast(`Faltam ${missing.toLocaleString('pt-BR')} moedas`, true);
  },
  buyItem: (id) => buyItem(id),
  equipItem: (id) => equipItem(id),
  confirmPack: (id) => confirmPack(id),
  toggleMute: () => toggleMute(),
  closeShop: () => closeShop(),
  touchMove: (x, z) => {
    if (duelActive && duelInput) duelInput.setMove(x, z);
    else game.setTouchMove(x, z);
  },
  touchAim: (x, z, fire) => {
    if (duelActive && duelInput) {
      duelInput.setAim(x, z);
      if (fire) duelInput.setFiring(true);
    } else {
      game.setTouchAim(x, z, fire);
    }
  },
  touchFire: (on) => {
    if (duelActive && duelInput) duelInput.setFiring(on);
    else game.setTouchFire(on);
  },
  touchSlash: () => {
    if (duelActive && duelInput) duelInput.action('slash');
    else game.inputSlash();
  },
  touchParry: () => {
    if (duelActive && duelInput) duelInput.action('parry');
    else game.inputParry();
  },
  touchDash: () => {
    if (duelActive && duelInput) duelInput.action('dash');
    else game.inputDash();
  },
  touchSpecial: () => {
    if (duelActive && duelInput) duelInput.action('special');
    else game.inputSpecial();
  },
  online: () => openOnline(),
  fullscreen: () => toggleFullscreen(),
};

ui = new UI(uiRoot, () => save, actions);
onlineUI = new OnlineUI(onlineRoot, {
  quickMatch: () => queueOnline(),
  createRoom: () => queueOnline(null, true),
  joinRoom: (code) => queueOnline(code),
  leave: () => cancelQueue(),
  retry: () => queueOnline(lastRoomCode),
  back: () => closeOnline(),
});
onlineUI.hide();
ui.setLevel(currentLevelId);
ui.setMuted(save.muted);
audio.setMuted(save.muted);
ui.showMenu();

document.getElementById('boot')?.classList.add('gone');

function duelUrl(): string {
  const configured = (import.meta.env.VITE_DUEL_URL as string | undefined)?.trim();
  if (configured) return configured;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

function createDuelClient(): DuelClient {
  const generation = ++duelGeneration;
  const client = new DuelClient(duelUrl(), {
    onStatus: (status, detail) => {
      if (generation !== duelGeneration) return;
      if (status === 'closed') {
        if (duelResultShown) return;
        if (duelActive) {
          endDuelMatch({
            winner: null,
            score: lastDuelScore,
            reason: 'conexão encerrada',
          });
        } else if (onlineUI?.visible) {
          onlineUI.showLobby('offline', detail || 'A conexão com o servidor foi encerrada.');
        }
        return;
      }
      onlineUI?.setStatus(status, detail);
    },
    onWelcome: (info) => {
      if (generation !== duelGeneration) return;
      duelLocalId = info.id;
      lastRoomCode = info.room;
    },
    onQueue: (room) => {
      if (generation !== duelGeneration) return;
      lastRoomCode = room;
      onlineUI.showQueue(room, 1);
    },
    onMatched: (info) => {
      if (generation !== duelGeneration) return;
      lastRoomCode = info.room;
      startDuelMatch(info.side);
    },
    onSnapshot: (snapshot) => {
      if (generation !== duelGeneration || !duelActive) return;
      duelLocalId = client.localId ?? duelLocalId;
      lastDuelScore = snapshot.score;
      game.applyDuelSnapshot(snapshot, duelLocalId);
      onlineUI.updateDuel(snapshot, duelLocalId, client.rtt);
      const self = snapshot.players.find((player) => player.id === duelLocalId);
      ui.setTouchIaiReady(Boolean(self && self.focus >= 100));
    },
    onEvent: (event) => {
      if (generation !== duelGeneration || !duelActive) return;
      game.duelEvent(event);
    },
    onEnd: (info) => {
      if (generation !== duelGeneration) return;
      endDuelMatch(info);
    },
    onError: (code, message) => {
      if (generation !== duelGeneration) return;
      // A stale/closed room must not trap "Tentar de novo" in a loop.
      if (code.startsWith('ROOM_') || code === 'BAD_ROOM_CODE' || code === 'SERVER_FULL') {
        lastRoomCode = null;
      }
      if (!duelActive) onlineUI.setStatus('error', message || code);
    },
  });
  duelClient = client;
  return client;
}

function queueOnline(room: string | null = null, create = false): void {
  if (duelActive) return;
  const now = performance.now();
  if (now - lastQueueAt < 420) return;
  lastQueueAt = now;
  if (!room && !create) lastRoomCode = null;
  duelGeneration += 1;
  duelClient?.disconnect();
  duelClient = null;
  duelResultShown = false;
  lastDuelScore = [0, 0];
  onlineUI.showLobby('connecting');
  const client = createDuelClient();
  client.connect(findSkin(save.skin).name, save.skin);
  if (room) {
    lastRoomCode = room;
    client.joinRoom(room);
  } else if (create) {
    client.createRoom();
  }
}

function cancelQueue(): void {
  duelGeneration += 1;
  duelClient?.leave();
  duelClient = null;
  onlineUI.showLobby('idle', 'Escolha uma partida rápida ou entre com um código de sala.');
  document.body.classList.remove('playing', 'duel');
}

function startDuelMatch(side: 0 | 1): void {
  if (duelActive || !duelClient) return;
  duelActive = true;
  duelResultShown = false;
  duelLocalId = duelClient.localId ?? duelLocalId;
  ui.hideScreens();
  game.startDuel(side, findSkin(save.skin));
  onlineUI.showDuel();
  document.body.classList.add('playing', 'duel');
  const crosshair = document.getElementById('crosshair');
  if (crosshair) {
    crosshair.classList.add('active');
    crosshair.style.left = `${window.innerWidth / 2}px`;
    crosshair.style.top = `${window.innerHeight * 0.46}px`;
  }
  duelInput?.detach();
  duelInput = new DuelInput(duelClient, game);
  duelInput.attach();
  duelInput.setAim(side === 0 ? 1 : -1, 0);
  ui.setTouchIaiReady(false);
  const hud = onlineRoot.querySelector('.online-hud');
  hud?.querySelector('.online-forfeit')?.remove();
  if (hud) {
    const leave = document.createElement('button');
    leave.type = 'button';
    leave.className = 'online-forfeit';
    leave.textContent = 'Sair';
    let armed = false;
    let timer = 0;
    leave.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        leave.textContent = 'Confirmar saída';
        leave.classList.add('is-armed');
        timer = window.setTimeout(() => {
          armed = false;
          leave.textContent = 'Sair';
          leave.classList.remove('is-armed');
        }, 2600);
        return;
      }
      window.clearTimeout(timer);
      closeOnline();
    });
    hud.appendChild(leave);
  }
}

function endDuelMatch(info: DuelEndInfo): void {
  if (!duelActive && duelResultShown) return;
  duelActive = false;
  duelResultShown = true;
  duelInput?.detach();
  duelInput = null;
  duelClient?.setFiring(false);
  if (onlineUI?.visible) {
    onlineUI.showResult(info.winner, info.score, duelLocalId, info.reason);
  }
  lastDuelScore = info.score;
  document.body.classList.remove('playing', 'duel');
  document.getElementById('crosshair')?.classList.remove('active');
  ui.setTouchIaiReady(false);
}

function closeOnline(): void {
  duelGeneration += 1;
  duelInput?.detach();
  duelInput = null;
  duelClient?.leave();
  duelClient = null;
  duelActive = false;
  duelResultShown = false;
  duelLocalId = '';
  document.getElementById('crosshair')?.classList.remove('active');
  onlineUI?.hide();
  document.body.classList.remove('playing', 'duel');
  game.showMenu();
  ui.showMenu();
}

function openOnline(): void {
  if (duelActive) return;
  lastRoomCode = null;
  lastDuelScore = [0, 0];
  duelGeneration += 1;
  duelClient?.disconnect();
  duelClient = null;
  duelResultShown = false;
  ui.hideScreens();
  document.body.classList.remove('playing', 'duel');
  game.showMenu();
  onlineUI.showLobby('idle', 'Escolha uma partida rápida ou entre com um código. A conexão começa ao entrar.');
}

function applyLoadout(): void {
  game.setLoadout(buildLoadout());
}

function startLevel(index: number): void {
  const level = LEVELS[index];
  if (!level) return;
  currentLevelId = level.id;
  reviveCount = 0;
  lastDeath = null;
  lastWin = null;
  ui.setLevel(level.id);
  game.startLevel(index);
}

function startNextLevel(): void {
  const cleared = (id: number) => (save.stars[id] ?? 0) > 0;
  let next = 0;
  let found = false;
  for (let i = 0; i < save.unlocked; i++) {
    if (!cleared(LEVELS[i].id)) {
      next = i;
      found = true;
      break;
    }
  }
  if (!found) next = Math.min(save.unlocked - 1, LEVELS.length - 1);
  startLevel(next);
}

function equipItem(id: string, doPersist = true): boolean {
  const item = findItem(id);
  if (!item || !save.owned.includes(id)) return false;
  if (item.type === 'skin') save.skin = id;
  else if (item.type === 'theme') save.theme = id;
  else if (item.type === 'trail') save.trail = id;
  else return false;
  if (doPersist) persist(save);
  applyLoadout();
  return true;
}

function buyItem(id: string): boolean {
  const item = findItem(id);
  if (!item) return false;
  if (save.owned.includes(id)) return equipItem(id);
  if (item.price <= 0) {
    ui.showShop('moedas');
    ui.toast('Exclusivo do Founder Pack', true);
    return false;
  }
  if (save.coins < item.price) {
    const missing = item.price - save.coins;
    ui.showShop('moedas');
    ui.toast(`Faltam ${missing.toLocaleString('pt-BR')} moedas`, true);
    return false;
  }
  save.coins -= item.price;
  save.owned.push(id);
  persist(save);
  ui.setCoins(save.coins);
  if (item.type === 'skin' || item.type === 'theme' || item.type === 'trail') {
    equipItem(id, false);
  } else {
    applyLoadout();
  }
  persist(save);
  return true;
}

async function confirmPack(id: string): Promise<{ ok: boolean; pending?: boolean; error?: string }> {
  const pack = findPack(id);
  if (!pack) return { ok: false, error: 'Pacote não encontrado.' };
  try {
    const result = await purchasePack(pack);
    if (!result.ok) return { ok: false, error: 'Pagamento não concluído.' };
    if (result.pendingVerification) return { ok: true, pending: true };
    if (!save.purchases.includes(result.reference)) {
      save.purchases.push(result.reference);
      save.coins += pack.coins;
      if (pack.includes) {
        for (const itemId of pack.includes) {
          if (!save.owned.includes(itemId)) save.owned.push(itemId);
        }
      }
      persist(save);
      ui.setCoins(save.coins);
      applyLoadout();
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Falha de rede ao processar o pagamento.' };
  }
}

function doRevive(): void {
  if (!lastDeath) return;
  const cost = lastDeath.reviveCost;
  if (save.coins < cost) {
    ui.showShop('moedas');
    ui.toast(`Faltam ${(cost - save.coins).toLocaleString('pt-BR')} moedas`, true);
    return;
  }
  save.coins -= cost;
  save.purchases.push(`revive:${Date.now()}`);
  persist(save);
  ui.setCoins(save.coins);
  reviveCount++;
  lastDeath = null;
  ui.showHUD();
  game.revive();
}

function handleWin(result: GameResult): void {
  const level = LEVELS[result.level - 1];
  if (!level) return;
  const previousStars = save.stars[level.id] ?? 0;
  const stars = result.time <= level.par ? 3 : result.time <= level.par * 1.6 ? 2 : 1;
  const firstClear = previousStars === 0;
  save.stars[level.id] = Math.max(previousStars, stars);
  if (!save.best[level.id] || result.time < save.best[level.id]) save.best[level.id] = result.time;
  const unlockedBefore = save.unlocked;
  save.unlocked = Math.min(LEVELS.length, Math.max(save.unlocked, level.id + 1));
  const base = firstClear ? level.reward : 40;
  const coinMult = findSkin(save.skin).coinMult ?? 1;
  const coinsEarned = Math.round((base + result.fragments * 15) * coinMult);
  save.coins += coinsEarned;
  save.plays += 1;
  save.kills += result.kills;
  persist(save);
  ui.setCoins(save.coins);
  reviveCount = 0;
  const nextIndex = result.level < LEVELS.length ? result.level : null;
  const newlyUnlocked = save.unlocked > unlockedBefore ? LEVELS[save.unlocked - 1] : null;
  const allDone = LEVELS.every((l) => (save.stars[l.id] ?? 0) > 0);
  lastWin = {
    level,
    stars,
    time: result.time,
    fragments: result.fragments,
    fragmentsTotal: result.fragmentsTotal,
    coinsEarned,
    firstClear,
    nextIndex,
    newlyUnlocked,
    allDone,
  };
  ui.showWin(lastWin);
}

function handleDeath(result: GameResult): void {
  const level = LEVELS[result.level - 1];
  if (!level) return;
  const cost = REVIVE_COST + reviveCount * REVIVE_COST_STEP;
  lastDeath = { level, kills: result.kills, time: result.time, reviveCost: cost };
  ui.showDeath(lastDeath);
}

function closeShop(): void {
  const state = game.getState();
  if (state === 'dead' && lastDeath) {
    ui.showDeath(lastDeath);
    return;
  }
  if (state === 'won' && lastWin) {
    ui.showWin(lastWin);
    return;
  }
  if (state === 'paused') {
    ui.showPause();
    return;
  }
  game.showMenu();
  ui.showMenu();
}

function toggleMute(): void {
  save.muted = !save.muted;
  persist(save);
  audio.setMuted(save.muted);
  ui.setMuted(save.muted);
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (onlineUI?.visible) {
    if (e.code === 'Escape') {
      if (duelActive) return;
      closeOnline();
      return;
    }
    if (e.code === 'Enter') return;
  }
  if (e.code === 'KeyM') {
    toggleMute();
    return;
  }
  if (e.code === 'Escape') {
    if (ui.isModalOpen()) {
      ui.closeModal();
      return;
    }
    const screen = ui.getActiveScreen();
    if (screen === 'hud') {
      actions.pause();
    } else if (screen === 'pause') {
      actions.resume();
    } else if (screen === 'briefing') {
      game.showMenu();
      ui.showMenu();
    } else if (screen === 'shop') {
      closeShop();
    } else if (screen === 'levels' || screen === 'roster') {
      ui.showMenu();
    } else if (screen === 'death' || screen === 'win') {
      game.showMenu();
      ui.showMenu();
    }
    return;
  }
  if (e.code === 'Enter') {
    if (ui.getActiveScreen() === 'briefing') {
      actions.begin();
    }
  }
});

window.addEventListener('pointermove', (e) => {
  if (!duelActive) return;
  const crosshair = document.getElementById('crosshair');
  if (!crosshair) return;
  crosshair.style.left = `${e.clientX}px`;
  crosshair.style.top = `${e.clientY}px`;
});

window.addEventListener('pointerdown', () => audio.init(), { once: true });

// Switching tabs/apps must not leave the campaign running (or keys "held") behind the user's back.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden || duelActive) return;
  game.releaseInputs();
  if (game.getState() === 'playing') actions.pause();
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__MOVESTOP__ = {
    game,
    ui,
    save,
    startLevel,
    handleWin,
    handleDeath,
    LEVELS,
    applyLoadout,
    onlineUI,
    queueOnline,
    cancelQueue,
    closeOnline,
    get duelClient() { return duelClient; },
    get duelInput() { return duelInput; },
    get duelActive() { return duelActive; },
    get lastDuelScore() { return lastDuelScore; },
  };
}
