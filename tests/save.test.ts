import { beforeEach, describe, expect, it } from 'bun:test';

// save.ts reads window.localStorage; a minimal in-memory stand-in is enough here
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
};
const { loadSave, persist, defaultSave } = await import('../src/game/save');

const KEY = 'movestop.save.v1';
const withRaw = (value: unknown) => store.set(KEY, JSON.stringify({ ...defaultSave(), ...(value as object) }));

describe('save: economia de energia', () => {
  beforeEach(() => store.clear());

  it('começa desligada', () => {
    expect(loadSave().economy).toBe(false);
  });

  it('liga e persiste', () => {
    const save = loadSave();
    save.economy = true;
    persist(save);
    expect(loadSave().economy).toBe(true);
  });

  it('um save adulterado só liga com true literal', () => {
    for (const bad of ['true', 1, 'yes', {}, [], null]) {
      withRaw({ economy: bad });
      expect(loadSave().economy).toBe(false);
    }
  });

  it('save antigo, sem o campo, continua válido', () => {
    const old = { ...defaultSave() } as Record<string, unknown>;
    delete old.economy;
    store.set(KEY, JSON.stringify(old));
    expect(loadSave().economy).toBe(false);
  });
});
