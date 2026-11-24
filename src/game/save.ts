import { DEFAULT_OWNED, DEFAULT_SKIN, DEFAULT_THEME, DEFAULT_TRAIL } from './catalog';
import { isDifficulty, type Difficulty } from './difficulty';

export interface SaveData {
  version: 1;
  coins: number;
  owned: string[];
  skin: string;
  theme: string;
  trail: string;
  difficulty: Difficulty;
  /** number of unlocked levels, 1..3 */
  unlocked: number;
  stars: Record<string, number>;
  best: Record<string, number>;
  purchases: string[];
  muted: boolean;
  plays: number;
  kills: number;
}

const KEY = 'movestop.save.v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
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
    save.unlocked = Math.min(8, Math.max(1, Math.floor(save.unlocked || 1)));
    save.difficulty = isDifficulty(save.difficulty) ? save.difficulty : base.difficulty;
    return save;
  } catch {
    return defaultSave();
  }
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
