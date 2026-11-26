/**
 * Dev-only sandbox panel (open the game with `?sandbox` while running `bun run dev`).
 * Spawns any enemy by hand, toggles test cheats and shows the live time scale.
 * It is loaded with a dynamic import behind `import.meta.env.DEV`, so it never
 * reaches the production bundle.
 */
import '../sandbox.css';
import type { Game, SandboxOptions } from '../game/game';
import { ENEMY_DEFS, type EnemyType } from '../game/levels';
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../game/difficulty';

export interface SandboxHost {
  game: Game;
  getDifficulty(): Difficulty;
  setDifficulty(value: Difficulty): void;
  /** reload the arena (new HP/ammo for the current difficulty) and show the HUD */
  restart(): void;
}

const TYPES = Object.keys(ENEMY_DEFS) as EnemyType[];

/** Hotkey per enemy, in panel order: 1…9 then 0 for the tenth. */
function hotkey(index: number): string | null {
  if (index < 9) return String(index + 1);
  if (index === 9) return '0';
  return null;
}

const TOGGLES: { key: keyof SandboxOptions; label: string }[] = [
  { key: 'invulnerable', label: 'Invulnerável' },
  { key: 'infiniteAmmo', label: 'Munição infinita' },
];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, className = 'sbx-btn'): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

export function mountSandbox(host: SandboxHost): void {
  const { game } = host;
  const root = el('aside', 'sbx');
  root.setAttribute('aria-label', 'Sandbox de inimigos');

  // keep focus on the game: a focused button would swallow Space (shoot) and Enter
  root.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) e.preventDefault();
  });

  const head = el('div', 'sbx-head');
  const title = el('strong', 'sbx-title', 'SANDBOX');
  const collapse = button('–', () => {
    const collapsed = root.classList.toggle('is-collapsed');
    collapse.textContent = collapsed ? '+' : '–';
    collapse.setAttribute('aria-label', collapsed ? 'Expandir painel' : 'Recolher painel');
  }, 'sbx-icon');
  collapse.setAttribute('aria-label', 'Recolher painel');
  head.append(title, collapse);

  const body = el('div', 'sbx-body');

  const readout = el('div', 'sbx-readout');
  const timeValue = el('span', 'sbx-time');
  const timeBar = el('span', 'sbx-time-bar');
  const timeFill = el('span', 'sbx-time-fill');
  timeBar.append(timeFill);
  const enemyValue = el('span', 'sbx-enemies');
  readout.append(timeValue, timeBar, enemyValue);

  const spawnLabel = el('p', 'sbx-label', 'Inimigos');
  const spawnGrid = el('div', 'sbx-grid');
  TYPES.forEach((type, i) => {
    const def = ENEMY_DEFS[type];
    const b = button('', () => game.sandboxSpawn(type, 'random'), 'sbx-btn sbx-enemy');
    const keyLabel = hotkey(i);
    const key = el('kbd', undefined, keyLabel ?? '·');
    const name = el('span', undefined, def.label);
    b.style.setProperty('--enemy', `#${def.color.toString(16).padStart(6, '0')}`);
    b.append(key, name);
    b.title = keyLabel ? `Clique: posição aleatória · tecla ${keyLabel}: no cursor` : 'Clique: posição aleatória';
    spawnGrid.append(b);
  });
  const bossButton = button('', () => game.sandboxSpawnBoss(), 'sbx-btn sbx-enemy');
  bossButton.style.setProperty('--enemy', '#ff3b2e');
  bossButton.append(el('kbd', undefined, 'B'), el('span', undefined, 'RELOJOEIRO'));
  bossButton.title = 'Chefe final, à frente do jogador · tecla B';
  spawnGrid.append(bossButton);
  const hint = el('p', 'sbx-hint', 'Teclas 1–9 e 0 criam no cursor · B chefe final · Backspace limpa');

  const toggleLabel = el('p', 'sbx-label', 'Testes');
  const toggleRow = el('div', 'sbx-row');
  const toggleButtons = TOGGLES.map(({ key, label }) => {
    const b = button(label, () => {
      const options = game.getSandboxOptions();
      if (options) game.setSandboxOption(key, !options[key]);
      sync();
    }, 'sbx-btn sbx-toggle');
    toggleRow.append(b);
    return { key, b };
  });

  const actionRow = el('div', 'sbx-row');
  actionRow.append(
    button('Foco 100', () => game.sandboxFillFocus()),
    button('Limpar arena', () => game.sandboxClear()),
    button('Reiniciar', () => host.restart()),
  );

  const diffLabel = el('p', 'sbx-label', 'Dificuldade');
  const diffRow = el('div', 'sbx-row sbx-seg');
  const diffButtons = DIFFICULTY_ORDER.map((id) => {
    const b = button(DIFFICULTIES[id].label, () => {
      if (host.getDifficulty() === id) return;
      host.setDifficulty(id);
      host.restart();
      sync();
    }, 'sbx-btn sbx-toggle');
    diffRow.append(b);
    return { id, b };
  });

  body.append(readout, spawnLabel, spawnGrid, hint, toggleLabel, toggleRow, actionRow, diffLabel, diffRow);
  root.append(head, body);
  document.body.append(root);

  function sync(): void {
    const options = game.getSandboxOptions();
    root.hidden = options === null;
    if (!options) return;
    for (const { key, b } of toggleButtons) b.setAttribute('aria-pressed', String(options[key]));
    const difficulty = host.getDifficulty();
    for (const { id, b } of diffButtons) b.setAttribute('aria-pressed', String(id === difficulty));
    const stats = game.sandboxStats();
    const pct = Math.round(stats.timeScale * 100);
    timeValue.textContent = `Tempo ${pct}%`;
    timeFill.style.width = `${pct}%`;
    enemyValue.textContent = `${stats.enemies} ${stats.enemies === 1 ? 'inimigo' : 'inimigos'}`;
  }

  window.setInterval(sync, 120);
  sync();

  window.addEventListener('keydown', (e) => {
    if (!game.isSandbox() || e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    const digit = /^Digit([0-9])$/.exec(e.code);
    if (digit) {
      const n = Number(digit[1]);
      const type = TYPES[n === 0 ? 9 : n - 1];
      if (type) game.sandboxSpawn(type, 'cursor');
      return;
    }
    if (e.code === 'KeyB') {
      game.sandboxSpawnBoss();
      return;
    }
    if (e.code === 'Backspace') {
      e.preventDefault();
      game.sandboxClear();
    }
  });
}
