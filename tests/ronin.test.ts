import { describe, expect, it } from 'bun:test';
import { ENEMY_DEFS } from '../src/game/levels';
import {
  COMBO_FOLLOWUP,
  byPhase,
  chooseRoninAttack,
  roninHealthAfterHit,
  rushLength,
  skyArrowTargets,
  type AttackChoiceInput,
} from '../src/game/ronin';

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

describe('ronin: combo do Impossível', () => {
  const mid = (t.combo.minRange + t.combo.maxRange) / 2;

  it('abre o combo a média distância quando está pronto, mesmo com o jogador fugindo', () => {
    expect(choose({ dist: mid, comboReady: true })).toBe('combo');
    expect(choose({ dist: mid, comboReady: true, awaySpeed: 5 })).toBe('combo');
  });

  it('sem combo pronto (ou fora do Impossível) segue o padrão de sempre', () => {
    expect(choose({ dist: mid, comboReady: false })).toBeNull();
    expect(choose({ dist: mid, awaySpeed: t.fleeSpeed })).toBe('shuriken');
    // too close or too far for the opening rush
    expect(choose({ dist: 1, comboReady: true })).toBe('heavy');
    expect(choose({ dist: t.combo.maxRange + 1, comboReady: true })).toBeNull();
  });

  it('a sequência é avanço → shurikens nas laterais → golpe pesado (que abre a janela)', () => {
    expect(COMBO_FOLLOWUP).toEqual(['flank', 'heavy']);
  });

  it('o avanço para na frente do jogador, a espada alcança o resto, e tem limite', () => {
    expect(rushLength(5, t)).toBeCloseTo(5 - t.combo.rush.stopShort);
    expect(rushLength(50, t)).toBe(t.combo.rush.maxLength);
    // he never ends on top of the player: stops outside both bodies
    expect(t.combo.rush.stopShort).toBeGreaterThan(ENEMY_DEFS.ronin.radius * ENEMY_DEFS.ronin.scale);
    // but the blade covers the gap, so standing in the lane is a hit
    expect(t.combo.rush.reach).toBeGreaterThan(t.combo.rush.stopShort);
  });

  it('as duas shurikens deixam o centro livre e fecham as laterais', () => {
    expect(t.combo.flank.angle).toBeGreaterThan(0.2);
    expect(t.combo.flank.angle).toBeLessThan(t.heavy.halfArc); // inside the cut that follows
  });

  it('tem tempo de recarga longo: não é o ataque de sempre', () => {
    expect(t.combo.cooldown).toBeGreaterThan(byPhase(t.attackCooldown.impossible, 1) * 3);
  });
});

describe('ronin: flechas do céu na fase 2', () => {
  it('só na fase 2, três flechas', () => {
    expect(byPhase(t.skyArrows.count, 1)).toBe(0);
    expect(byPhase(t.skyArrows.count, 2)).toBe(3);
  });

  it('uma no jogador e as outras dos dois lados da linha até ele', () => {
    const spots = skyArrowTargets(0, 0, 0, 1, 3, 2); // he is "south", looking +z
    expect(spots[0]).toEqual({ x: 0, z: 0 });
    expect(spots[1].z).toBeCloseTo(0);
    expect(spots[2].z).toBeCloseTo(0);
    expect(spots[1].x).toBeCloseTo(-spots[2].x);
    expect(Math.abs(spots[1].x)).toBeCloseTo(2);
  });

  it('as marcas não se sobrepõem: entre duas sempre cabe o jogador', () => {
    const PLAYER_DIAMETER = 0.6;
    expect(t.skyArrows.spacing - t.skyArrows.radius * 2).toBeGreaterThan(PLAYER_DIAMETER);
  });
});
