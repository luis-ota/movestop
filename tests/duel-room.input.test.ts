import { afterEach, describe, expect, it } from 'bun:test';
import { ACTIONS, DUEL_RULES } from '../src/shared/duel';
import {
  act,
  enterLive,
  forceSnapshot,
  lastMessage,
  messagesOf,
  place,
  roomTracker,
  stepSim,
} from './support/duel-harness';

const track = roomTracker();

afterEach(() => {
  track.closeAll();
});

function liveMatch(code = 'INPUT') {
  const harness = track.match(code);
  enterLive(harness.room);
  return harness;
}

describe('DuelRoom — input autoritativo', () => {
  it('normaliza move acima de 1 e mantém vetores pequenos intactos', () => {
    const { room, players } = liveMatch();
    const player = players[0];

    room.input(player.id, 1, [3, 4], [0, 1]);
    expect(player.move[0]).toBeCloseTo(0.6, 9);
    expect(player.move[1]).toBeCloseTo(0.8, 9);

    room.input(player.id, 2, [10, 0], [0, 1]);
    expect(player.move).toEqual([1, 0]);

    room.input(player.id, 3, [-10, -10], [0, 1]);
    expect(player.move[0]).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(player.move[1]).toBeCloseTo(-Math.SQRT1_2, 9);

    room.input(player.id, 4, [0.25, -0.5], [0, 1]);
    expect(player.move).toEqual([0.25, -0.5]);

    room.input(player.id, 5, [-2, 0], [0, 1]);
    expect(player.move).toEqual([-1, 0]);
  });

  it('ignora seq repetido, regressivo, zero, negativo, NaN e Infinity', () => {
    const { room, players } = liveMatch();
    const player = players[0];

    room.input(player.id, 5, [1, 0], [1, 0]);
    expect(player.lastInputSeq).toBe(5);

    room.input(player.id, 5, [0, 1], [0, 1]);
    room.input(player.id, 4, [0, 1], [0, 1]);
    room.input(player.id, 0, [0, 1], [0, 1]);
    room.input(player.id, -1, [0, 1], [0, 1]);
    room.input(player.id, NaN, [0, 1], [0, 1]);
    room.input(player.id, Infinity, [0, 1], [0, 1]);

    expect(player.lastInputSeq).toBe(5);
    expect(player.move).toEqual([1, 0]);
    expect(player.aim).toEqual([1, 0]);

    room.input(player.id, 6, [-1, 0], [0, -1]);
    expect(player.lastInputSeq).toBe(6);
    expect(player.move).toEqual([-1, 0]);
    expect(player.aim[0]).toBeCloseTo(0, 9);
    expect(player.aim[1]).toBeCloseTo(-1, 9);
  });

  it('normaliza aim e recusa aim zero, NaN ou Infinity', () => {
    const { room, players } = liveMatch();
    const player = players[0];
    player.aim = [0.6, 0.8];

    room.input(player.id, 1, [0, 0], [0, 0]);
    expect(player.aim).toEqual([0.6, 0.8]);

    room.input(player.id, 2, [0, 0], [NaN, 0]);
    expect(player.aim).toEqual([0.6, 0.8]);

    room.input(player.id, 3, [0, 0], [Infinity, 0]);
    expect(player.aim).toEqual([0.6, 0.8]);

    room.input(player.id, 4, [0, 0], [0.001, 0]);
    expect(player.aim).toEqual([0.6, 0.8]);

    room.input(player.id, 5, [0, 0], [1, 0]);
    expect(player.aim).toEqual([1, 0]);

    room.input(player.id, 6, [0, 0], [3, 4]);
    expect(player.aim[0]).toBeCloseTo(0.6, 9);
    expect(player.aim[1]).toBeCloseTo(0.8, 9);
  });

  it('cliente não consegue definir posição, vida, munição, foco ou lado', () => {
    const { room, players } = liveMatch();
    const [player, opponent] = players;

    player.x = 1.25;
    player.z = -3;
    player.vx = 0;
    player.vz = 0;
    player.hp = 1;
    player.ammo = 6;
    player.focus = 0;

    const evil = {
      seq: 1,
      move: [1, 0] as [number, number],
      aim: [1, 0] as [number, number],
      x: 999,
      z: -999,
      hp: 0,
      ammo: 0,
      focus: 100,
      side: 1,
    };
    // Campos extras de um pacote hostil não têm efeito: input só recebe intenções.
    (room as any).input(player.id, evil.seq, evil.move, evil.aim, evil);

    expect(player.x).toBe(1.25);
    expect(player.z).toBe(-3);
    expect(player.hp).toBe(1);
    expect(player.ammo).toBe(6);
    expect(player.focus).toBe(0);
    expect(player.side).toBe(0);
    expect(player.alive).toBe(true);
    expect(opponent.hp).toBe(1);
    expect(player.move).toEqual([1, 0]);

    stepSim(room, 5);
    expect(player.x).toBeGreaterThan(1.25);
    expect(player.hp).toBe(1);
  });

  it('input de jogador inexistente não quebra nem altera a sala', () => {
    const { room } = liveMatch();

    expect(() => room.input('fantasma', 1, [1, 0], [1, 0])).not.toThrow();
    expect(room.players).toHaveLength(2);
    expect(room.state).toBe('live');
  });

  it('input com move NaN/Infinity não altera o estado', () => {
    // O guard do servidor rejeita o pacote inteiro se qualquer componente do
    // move ou do aim não for finito (defesa em profundidade além do parser).
    const { room, players } = liveMatch();
    const player = players[0];
    player.move = [0, 0];
    const x = player.x;
    const z = player.z;

    room.input(player.id, 1, [NaN, 0], [0, 1]);
    room.input(player.id, 2, [Infinity, 0], [0, 1]);

    // O pacote inválido é rejeitado por inteiro, sem avançar o seq: o cliente
    // ainda pode mandar um input válido com o mesmo contador.
    expect(player.lastInputSeq).toBe(0);
    expect(player.move).toEqual([0, 0]);
    stepSim(room, 1);
    expect(Number.isFinite(player.x)).toBe(true);
    expect(Number.isFinite(player.z)).toBe(true);
    expect(player.x).toBe(x);
    expect(player.z).toBe(z);
  });
});

describe('DuelRoom — abuse de actions', () => {
  it('máscaras inválidas não lançam nem disparam ações', () => {
    const { room, players } = liveMatch('MASK');
    const player = players[0];
    const invalidMasks = [NaN, 1.5, 32, 64, 128, Infinity];

    for (let i = 0; i < invalidMasks.length; i++) {
      expect(() => act(room, player, i + 1, invalidMasks[i])).not.toThrow();
    }

    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(player.parryWindow).toBe(0);
    expect(player.parryCd).toBe(0);
    expect(player.dashTime).toBe(0);
    expect(player.dashCd).toBe(0);
    expect(player.slashCd).toBe(0);
    expect(player.focus).toBe(0);
    expect(forceSnapshot(room).bullets).toHaveLength(0);
    expect(messagesOf(player.ws as any, 'event').filter((e: any) => e.kind === 'shot')).toHaveLength(0);
  });

  it('máscara negativa é dobrada por & 31 e não lança (equivale a 31)', () => {
    const { room, players } = liveMatch('MASK-NEG');
    const player = players[0];

    expect(() => act(room, player, 1, -1)).not.toThrow();

    // -1 & 31 === 31: liga todos os bits válidos. Não é crash, mas o pacote
    // inválido é aceito como "todas as ações"; ver relatório.
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(player.dashTime).toBeCloseTo(DUEL_RULES.dashTime, 9);
    expect(player.parryWindow).toBeCloseTo(DUEL_RULES.parryWindow, 9);
    expect(player.parryCd).toBeCloseTo(DUEL_RULES.parryCooldown, 9);
    expect(player.slashCd).toBeCloseTo(DUEL_RULES.slashCooldown, 9);
    expect(Number.isFinite(player.x)).toBe(true);
    expect(Number.isFinite(player.z)).toBe(true);
    expect(room.state).toBe('live');
  });

  it('actionId menor ou igual ao último é ignorado; o próximo válido passa', () => {
    const { room, players } = liveMatch('ACTION-ID');
    const player = players[0];
    place(player, -2, -3, [1, 0]);

    act(room, player, 5, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    player.fireCd = 0;
    act(room, player, 5, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    act(room, player, 4, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    act(room, player, 6, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 2);
    expect(forceSnapshot(room).bullets).toHaveLength(2);
  });

  it('actionId não finito é ignorado', () => {
    const { room, players } = liveMatch('ACTION-NAN');
    const player = players[0];

    expect(() => room.action(player.id, NaN, ACTIONS.shoot)).not.toThrow();
    expect(() => room.action(player.id, Infinity, ACTIONS.shoot)).not.toThrow();
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(player.lastActionId).toBe(0);
    expect(forceSnapshot(room).bullets).toHaveLength(0);
  });

  it('orçamento de 50ms limita ações aceitas (com relógio controlado)', () => {
    const { room, players } = liveMatch('BUDGET');
    const player = players[0];
    place(player, -2, -3, [1, 0]);

    const realNow = Date.now;
    const base = 1_000_000;
    let fakeNow = base;
    (Date as any).now = () => fakeNow;

    try {
      room.action(player.id, 1, ACTIONS.shoot);
      expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);

      // 10ms depois: dentro da janela de 50ms, deve ser descartado.
      fakeNow = base + 10;
      player.fireCd = 0;
      room.action(player.id, 2, ACTIONS.shoot);
      expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);

      // 51ms depois da primeira: a janela expirou.
      fakeNow = base + 51;
      player.fireCd = 0;
      room.action(player.id, 3, ACTIONS.shoot);
      expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 2);
    } finally {
      (Date as any).now = realNow;
    }
  });

  it('ação fora de live ou de jogador morto não faz nada', () => {
    const harness = track.match('NOT-LIVE');
    const { room, players } = harness;
    const player = players[0];

    expect(room.state).toBe('countdown');
    room.action(player.id, 1, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(forceSnapshot(room).bullets).toHaveLength(0);

    enterLive(room);
    player.alive = false;
    player.fireCd = 0;
    act(room, player, 2, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(forceSnapshot(room).bullets).toHaveLength(0);

    player.alive = true;
    room.state = 'roundEnd';
    act(room, player, 3, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo);
    expect(forceSnapshot(room).bullets).toHaveLength(0);

    room.state = 'live';
    act(room, player, 4, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);
    expect(lastMessage(player.ws as any, 'event')).toBeDefined();
  });
});
