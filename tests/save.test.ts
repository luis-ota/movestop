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

describe('save: migração para a campanha de nove fases', () => {
  beforeEach(() => store.clear());

  it('save antigo (v1): estrelas e recordes seguem o Cerco (7 → 8) e o chefe (8 → 9)', () => {
    withRaw({ version: 1, unlocked: 8, stars: { 6: 3, 7: 2, 8: 1 }, best: { 7: 61.5, 8: 140 } });
    const save = loadSave();
    expect(save.version).toBe(2);
    expect(save.stars).toEqual({ 6: 3, 8: 2, 9: 1 });
    expect(save.best).toEqual({ 8: 61.5, 9: 140 });
    expect(save.unlocked).toBe(9); // still reaches the boss; the duel opens with it
  });

  it('quem não tinha chegado ao Cerco não ganha nada a mais', () => {
    withRaw({ version: 1, unlocked: 6, stars: { 5: 2 } });
    const save = loadSave();
    expect(save.unlocked).toBe(6);
    expect(save.stars).toEqual({ 5: 2 });
  });

  it('save sem versão é tratado como v1', () => {
    const old = { ...defaultSave(), unlocked: 7, stars: { 7: 1 } } as Record<string, unknown>;
    delete old.version;
    store.set(KEY, JSON.stringify(old));
    const save = loadSave();
    expect(save.unlocked).toBe(8);
    expect(save.stars).toEqual({ 8: 1 });
  });

  it('save já migrado (v2) não é migrado de novo', () => {
    withRaw({ version: 2, unlocked: 7, stars: { 7: 3 } });
    const save = loadSave();
    expect(save.unlocked).toBe(7);
    expect(save.stars).toEqual({ 7: 3 });
  });

  it('desbloqueio adulterado não passa do número de fases', () => {
    withRaw({ version: 2, unlocked: 999 });
    expect(loadSave().unlocked).toBe(9);
  });
});
