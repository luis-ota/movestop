import { describe, expect, it } from 'bun:test';
import { ENEMY_DEFS } from '../src/game/levels';
import { byPhase, chooseRoninAttack, roninHealthAfterHit, type AttackChoiceInput } from '../src/game/ronin';

const t = ENEMY_DEFS.ronin.ronin!;
const choose = (over: Partial<AttackChoiceInput>) =>
  chooseRoninAttack({ dist: 10, phase: 1, awaySpeed: 0, last: null, roll: 0.5, ...over }, t);

describe('ronin: escolha de ataque', () => {
  it('na fase 1 usa só o golpe pesado na distância da espada', () => {
    expect(choose({ dist: t.meleeRange })).toBe('heavy');
    expect(choose({ dist: 1, last: 'heavy' })).toBe('heavy');
    expect(choose({ dist: 1, roll: 0 })).toBe('heavy');
  });

  it('na fase 2 alterna corte rápido e golpe pesado, sem repetir o corte rápido', () => {
    expect(choose({ dist: 1, phase: 2, last: 'heavy' })).toBe('quickcut');
    expect(choose({ dist: 1, phase: 2, last: 'quickcut' })).toBe('heavy');
    expect(choose({ dist: 1, phase: 2, last: null, roll: 0.1 })).toBe('quickcut');
    expect(choose({ dist: 1, phase: 2, last: null, roll: 0.9 })).toBe('heavy');
  });

  it('lança shurikens só a média distância e com o jogador fugindo', () => {
    const mid = (t.meleeRange + t.shurikenRange) / 2;
    expect(choose({ dist: mid, awaySpeed: t.fleeSpeed })).toBe('shuriken');
    expect(choose({ dist: mid, awaySpeed: t.fleeSpeed - 0.1 })).toBeNull();
    expect(choose({ dist: mid, awaySpeed: -3 })).toBeNull();
    expect(choose({ dist: t.shurikenRange + 0.5, awaySpeed: 5 })).toBeNull();
  });
});

describe('ronin: vida em duas fases', () => {
  it('cada acerto tira um e a fase 1 vira uma fase 2 cheia', () => {
    expect(roninHealthAfterHit(1, 3, t)).toEqual({ phase: 1, hp: 2, dead: false });
    expect(roninHealthAfterHit(1, 1, t)).toEqual({ phase: 2, hp: t.hpPerPhase, dead: false });
    expect(roninHealthAfterHit(2, 2, t)).toEqual({ phase: 2, hp: 1, dead: false });
    expect(roninHealthAfterHit(2, 1, t)).toEqual({ phase: 2, hp: 0, dead: true });
  });

  it('são 3 + 3 acertos até cair', () => {
    let state = { phase: 1 as 1 | 2, hp: ENEMY_DEFS.ronin.hp, dead: false };
    let hits = 0;
    while (!state.dead) {
      state = roninHealthAfterHit(state.phase, state.hp, t);
      hits++;
    }
    expect(hits).toBe(6);
  });
});

describe('ronin: ritmo por dificuldade', () => {
  it('só no Impossível ataca colado; Fácil é o mais lento', () => {
    for (const phase of [1, 2] as const) {
      const easy = byPhase(t.attackCooldown.easy, phase);
      const hard = byPhase(t.attackCooldown.hard, phase);
      const impossible = byPhase(t.attackCooldown.impossible, phase);
      expect(impossible).toBeLessThan(hard);
      expect(hard).toBeLessThan(easy);
    }
  });
});

describe('ronin: segunda fase mais rápida', () => {
  it('carrega e descansa menos na fase 2', () => {
    expect(byPhase(t.heavy.windup, 2)).toBeLessThan(byPhase(t.heavy.windup, 1));
    expect(byPhase(t.heavy.recovery, 2)).toBeLessThan(byPhase(t.heavy.recovery, 1));
    expect(byPhase(t.shuriken.windup, 2)).toBeLessThan(byPhase(t.shuriken.windup, 1));
    for (const d of ['easy', 'hard', 'impossible'] as const) {
      expect(byPhase(t.attackCooldown[d], 2)).toBeLessThan(byPhase(t.attackCooldown[d], 1));
    }
    expect(byPhase(t.arrows.count, 2)).toBeGreaterThan(byPhase(t.arrows.count, 1));
  });

  it('a área do golpe pesado alcança quem está na distância da espada', () => {
    expect(t.heavy.range).toBeGreaterThan(t.meleeRange);
  });

  it('shurikens saem fora do corpo e antes de onde ele começa a lançá-las', () => {
    expect(t.throwOffset).toBeGreaterThan(ENEMY_DEFS.ronin.radius);
    // senão a estrela nasceria em cima ou atrás do jogador mais próximo que ele mira
    expect(t.throwOffset).toBeLessThan(t.meleeRange);
  });
});
