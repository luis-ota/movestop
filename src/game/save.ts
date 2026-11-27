import { DEFAULT_OWNED, DEFAULT_SKIN, DEFAULT_THEME, DEFAULT_TRAIL } from './catalog';
import { isDifficulty, type Difficulty } from './difficulty';
import { LEVELS } from './levels';

/** v2: the Ronin duel became level 7 (see migrateV1). */
export const SAVE_VERSION = 2;

export interface SaveData {
  version: number;
  coins: number;
  owned: string[];
  skin: string;
  theme: string;
  trail: string;
  difficulty: Difficulty;
  /** number of unlocked levels, counted from the first (1..LEVELS.length) */
  unlocked: number;
  stars: Record<string, number>;
  best: Record<string, number>;
  purchases: string[];
  muted: boolean;
  /** power saving: the game draws at 30 fps instead of 60 */
  economy: boolean;
  plays: number;
  kills: number;
}

const KEY = 'movestop.save.v1';

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    coins: 300,
    owned: [...DEFAULT_OWNED],
    skin: DEFAULT_SKIN,
    theme: DEFAULT_THEME,
    trail: DEFAULT_TRAIL,
    difficulty: 'hard',
    unlocked: 1,
    stars: {},
    best: {},
    purchases: [],
    muted: false,
    economy: false,
    plays: 0,
    kills: 0,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultSave();
    const save: SaveData = {
      ...base,
      ...parsed,
      owned: Array.from(new Set([...base.owned, ...(parsed.owned ?? [])])),
      stars: { ...(parsed.stars ?? {}) },
      best: { ...(parsed.best ?? {}) },
      purchases: [...(parsed.purchases ?? [])],
    };
    save.coins = Math.max(0, Math.floor(save.coins || 0));
    save.unlocked = Math.max(1, Math.floor(save.unlocked || 1));
    const version = typeof parsed.version === 'number' ? parsed.version : 1;
    if (version < 2) migrateV1(save);
    save.version = SAVE_VERSION;
    save.unlocked = Math.min(LEVELS.length, save.unlocked);
    save.difficulty = isDifficulty(save.difficulty) ? save.difficulty : base.difficulty;
    // a hand-edited save can hold anything: only a literal `true` turns it on
    save.economy = parsed.economy === true;
    return save;
  } catch {
    return defaultSave();
  }
}

/**
 * v1 -> v2: the Ronin duel was inserted as level 7, so Cerco moved 7 -> 8 and
 * O Relojoeiro 8 -> 9. Stars and best times are keyed by level id and follow
 * their level; a player who had reached Cerco keeps access to it (unlocked
 * counts levels from the first, so the duel opens with it).
 */
export function migrateV1(save: SaveData): void {
  for (const table of [save.stars, save.best]) {
    // highest first, so 7 -> 8 never overwrites the old 8 before it moved
    for (const from of ['8', '7']) {
      if (!(from in table)) continue;
      table[String(Number(from) + 1)] = table[from];
      delete table[from];
    }
  }
  if (save.unlocked >= 7) save.unlocked += 1;
}

export function persist(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage may be unavailable; keep playing with in-memory save */
  }
}

export function resetSave(): SaveData {
  const fresh = defaultSave();
  persist(fresh);
  return fresh;
}
