import { afterEach, describe, expect, it } from 'bun:test';
import { ACTIONS, DUEL_RULES } from '../src/shared/duel';
import {
  act,
  enterLive,
  forceSnapshot,
  messagesOf,
  overlapsAnyCollider,
  place,
  roomTracker,
  stepSim,
  WALL_LIMIT_X,
  WALL_LIMIT_Z,
} from './support/duel-harness';

const track = roomTracker();

afterEach(() => {
  track.closeAll();
});

function liveArena(code: string) {
  const harness = track.match(code);
  enterLive(harness.room);
  return harness;
}

describe('DuelRoom — movimento e colisão', () => {
  it('move os dois jogadores no servidor quando recebe move normalizado', () => {
    const { room, players } = liveArena('MOVE');
    const [playerA, playerB] = players;
    place(playerA, -4, -3, [1, 0]);
    place(playerB, 4, -3, [-1, 0]);

    room.input(playerA.id, 1, [1, 0], [1, 0]);
    room.input(playerB.id, 1, [-1, 0], [-1, 0]);

    // A posição só muda na simulação; input é intenção, não teleporte.
    expect(playerA.x).toBe(-4);
    expect(playerB.x).toBe(4);

    stepSim(room, 15);

    expect(playerA.x).toBeGreaterThan(-3.5);
    expect(playerB.x).toBeLessThan(3.5);
    expect(playerA.x).toBeLessThan(playerB.x);
    expect(playerA.z).toBeCloseTo(-3, 6);
    expect(playerB.z).toBeCloseTo(-3, 6);
    expect(Number.isFinite(playerA.x)).toBe(true);
    expect(Number.isFinite(playerB.x)).toBe(true);
  });

  it('colisão impede atravessar bloco interno', () => {
    const { room, players } = liveArena('WALL-BLOCK');
    const player = players[0];
    place(player, -8, -4, [1, 0]);
    player.move = [1, 0];

    stepSim(room, 400);

    // O bloco em (-6,-4) ocupa x [-6.5,-5.5]; com raio 0.3, para em x=-6.8.
    expect(player.x).toBeGreaterThan(-8);
    expect(player.x).toBeLessThanOrEqual(-6.5 - 0.29);
    expect(player.z).toBeCloseTo(-4, 6);
    expect(overlapsAnyCollider(player.x, player.z)).toBe(false);
  });

  it('respeita os limites externos da arena em x e z', () => {
    const { room, players } = liveArena('WALL-LIMIT');
    const player = players[0];

    place(player, 8, -3, [1, 0]);
    player.move = [1, 0];
    stepSim(room, 400);
    expect(player.x).toBeLessThanOrEqual(WALL_LIMIT_X + 1e-9);
    expect(player.x).toBeGreaterThan(9);
    expect(player.z).toBeCloseTo(-3, 6);

    place(player, 3, -5, [0, 1]);
    player.move = [0, 1];
    stepSim(room, 400);
    expect(player.z).toBeLessThanOrEqual(WALL_LIMIT_Z + 1e-9);
    expect(player.z).toBeGreaterThan(6);
    expect(player.x).toBeCloseTo(3, 6);
  });

  it('projétil é removido ao colidir com parede', () => {
    const { room, players } = liveArena('WALL-BULLET');
    const player = players[0];
    place(player, -8, -4, [1, 0]);

    act(room, player, 1, ACTIONS.shoot);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    stepSim(room, 120);
    expect(forceSnapshot(room).bullets).toHaveLength(0);
  });
});

describe('DuelRoom — tiro', () => {
  it('shoot consome munição e publica um bullet serializável', () => {
    const { room, sockets, players } = liveArena('SHOOT');
    const [socketA] = sockets;
    const player = players[0];
    place(player, -2, -3, [1, 0]);

    act(room, player, 1, ACTIONS.shoot);

    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(player.fireCd).toBeCloseTo(DUEL_RULES.fireCooldown, 9);

    const snapshot = forceSnapshot(room);
    expect(snapshot.bullets).toHaveLength(1);
    const bullet = snapshot.bullets[0];
    expect(Object.keys(bullet).sort()).toEqual(['angle', 'id', 'life', 'owner', 'speed', 'x', 'z']);
    expect(bullet.owner).toBe(player.id);
    expect(bullet.x).toBeCloseTo(-1.45, 9);
    expect(bullet.z).toBeCloseTo(-3, 9);
    expect(bullet.angle).toBeCloseTo(Math.PI / 2, 9);
    expect(bullet.speed).toBe(DUEL_RULES.bulletSpeed);
    expect(bullet.life).toBe(DUEL_RULES.bulletLife);

    const shotEvents = messagesOf(socketA, 'event').filter((e: any) => e.kind === 'shot');
    expect(shotEvents).toHaveLength(1);
    expect(shotEvents[0].who).toBe(player.id);
  });

  it('respeita fireCd entre dois tiros', () => {
    const { room, players } = liveArena('FIRE-CD');
    const player = players[0];
    place(player, -2, -3, [1, 0]);

    act(room, player, 1, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    // Novo actionId, mas ainda em cooldown: não consome munição nem cria bullet.
    act(room, player, 2, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 1);
    expect(forceSnapshot(room).bullets).toHaveLength(1);

    stepSim(room, 7); // 7 * 1/30 > 0.2s
    expect(player.fireCd).toBeCloseTo(0, 9);

    act(room, player, 3, ACTIONS.shoot);
    expect(player.ammo).toBe(DUEL_RULES.spawnAmmo - 2);
    expect(forceSnapshot(room).bullets).toHaveLength(2);
  });

  it('disparo contínuo (firing) respeita fireCd até acabar a munição', () => {
    const { room, players, sockets } = liveArena('AUTO-FIRE');
    const [socketA] = sockets;
    const player = players[0];
    place(player, -2, -3, [1, 0]);
    player.ammo = 2;

    room.setFiring(player.id, true);
    stepSim(room, 20);

    expect(player.ammo).toBe(0);
    const snapshot = forceSnapshot(room);
    // The firing pulse advances time, so bullets may already have resolved;
    // the cooldown/ammo invariant is what matters here.
    expect(snapshot.players.find((p) => p.id === player.id)!.firing).toBe(true);
    const shotsFired = messagesOf(socketA, 'event').filter((e: any) => e.kind === 'shot');
    expect(shotsFired).toHaveLength(2);

    room.setFiring(player.id, false);
    stepSim(room, 10);
    expect(player.ammo).toBe(0);
    expect(messagesOf(socketA, 'event').filter((e: any) => e.kind === 'shot')).toHaveLength(2);
  });

  it('não aceita shoot com munição zero', () => {
    const { room, sockets, players } = liveArena('NO-AMMO');
    const [socketA] = sockets;
    const player = players[0];
    place(player, -2, -3, [1, 0]);
    player.ammo = 0;
    player.fireCd = 0;

    act(room, player, 1, ACTIONS.shoot);

    expect(player.ammo).toBe(0);
    expect(forceSnapshot(room).bullets).toHaveLength(0);
    expect(messagesOf(socketA, 'event').filter((e: any) => e.kind === 'shot')).toHaveLength(0);
  });
});

describe('DuelRoom — aparo', () => {
  it('reflete projétil inimigo próximo, ganha foco e não sofre dano', () => {
    const { room, sockets, players } = liveArena('PARRY');
    const [socketA, socketB] = sockets;
    const [attacker, parrier] = players;
    place(attacker, -3, -3, [1, 0]);
    place(parrier, -1.5, -3, [0, 1]);

    act(room, attacker, 1, ACTIONS.shoot);
    const before = forceSnapshot(room).bullets[0];
    expect(before.owner).toBe(attacker.id);

    act(room, parrier, 1, ACTIONS.parry);

    expect(parrier.parryWindow).toBeCloseTo(DUEL_RULES.parryWindow, 9);
    expect(parrier.parryCd).toBeCloseTo(DUEL_RULES.parryCooldown, 9);
    expect(parrier.focus).toBe(DUEL_RULES.focusParry);
    expect(parrier.hp).toBe(1);

    const after = forceSnapshot(room).bullets[0];
    expect(after.id).toBe(before.id);
    expect(after.owner).toBe(parrier.id);
    expect(parrier.hp).toBe(1);

    const parryEvents = messagesOf(socketB, 'event').filter((e: any) => e.kind === 'parry');
    expect(parryEvents).toHaveLength(1);
    expect(parryEvents[0].who).toBe(parrier.id);

    // O projétil agora pertence ao aparador; com o pulso de tiro ele pode
    // resolver no alvo, mas nunca pode ferir quem aparou.
    stepSim(room, 5);
    expect(parrier.hp).toBe(1);
    const moved = forceSnapshot(room).bullets.find((b: any) => b.id === before.id);
    if (moved) {
      expect(moved.owner).toBe(parrier.id);
      expect(moved.x).toBeLessThan(before.x);
    }
    expect(messagesOf(socketA, 'event').some((e: any) => e.kind === 'shot')).toBe(true);
  });

  it('janela de aparo reflete o projétil que entra no raio durante o simulate', () => {
    const { room, players } = liveArena('PARRY-WINDOW');
    const [attacker, parrier] = players;
    place(attacker, -3, -3, [1, 0]);
    place(parrier, -1.5, -3, [0, 1]);

    // Nenhum projétil no raio no momento do aparo: a janela fica aberta.
    act(room, parrier, 1, ACTIONS.parry);
    expect(parrier.parryWindow).toBeCloseTo(DUEL_RULES.parryWindow, 9);
    expect(parrier.focus).toBe(0);

    // Projétil inimigo a 0,45 unidades, logo fora do raio de acerto (0,38).
    (room as any).bullets.push({
      id: 999,
      owner: attacker.id,
      x: parrier.x - 0.45,
      z: parrier.z,
      vx: DUEL_RULES.bulletSpeed,
      vz: 0,
      angle: Math.PI / 2,
      speed: DUEL_RULES.bulletSpeed,
      life: DUEL_RULES.bulletLife,
    });

    stepSim(room, 4);

    const bullet = forceSnapshot(room).bullets[0];
    expect(bullet.owner).toBe(parrier.id);
    expect(parrier.hp).toBe(1);
    expect(parrier.focus).toBe(DUEL_RULES.focusParry);
    expect(parrier.parryWindow).toBeGreaterThan(0);
  });

  it('angle do bullet refletido acompanha a nova direção (server/duel-room.ts:459-468)', () => {
    // O aparo troca owner/vx/vz, mas não b.angle. O cliente usa o angle do
    // snapshot para girar o mesh do projétil (src/game/game.ts:832,972), então
    // o bullet refletido continua visualmente apontado para a direção antiga.
    // Correção esperada: b.angle = angle em parry(), simulate() e slash();
    // special() zera a velocidade e deveria tratar o angle de forma explícita.
    const { room, players } = liveArena('PARRY-ANGLE');
    const [attacker, parrier] = players;
    place(attacker, -3, -3, [1, 0]);
    place(parrier, -1.5, -3, [0, 1]);

    act(room, attacker, 1, ACTIONS.shoot);
    act(room, parrier, 1, ACTIONS.parry);

    const bullet = forceSnapshot(room).bullets[0];
    expect(bullet.owner).toBe(parrier.id);
    // A velocidade refletida aponta para -x; o angle deve acompanhar.
    expect(bullet.angle).toBeCloseTo(-Math.PI / 2, 9);
  });
});

describe('DuelRoom — dano e round', () => {
  it('projétil dentro do alcance mata, pontua e entra em roundEnd', () => {
    const { room, sockets, players } = liveArena('BULLET-KILL');
    const [, socketB] = sockets;
    const [attacker, target] = players;
    place(attacker, -0.9, -3, [1, 0]);
    place(target, 0.2, -3, [0, 1]);

    act(room, attacker, 1, ACTIONS.shoot);

    let ticks = 0;
    while (target.alive && ticks < 200) {
      stepSim(room, 1);
      ticks += 1;
    }

    expect(ticks).toBeLessThan(200);
    expect(target.hp).toBe(0);
    expect(target.alive).toBe(false);
    expect(room.score).toEqual([1, 0]);
    expect(room.state).toBe('roundEnd');
    expect(room.stateTimer).toBeCloseTo(DUEL_RULES.roundDelay, 6);
    expect(room.round).toBe(2);
    expect(room.lastWinner).toBe(attacker.id);

    const hitEvents = messagesOf(socketB, 'event').filter((e: any) => e.kind === 'hit');
    expect(hitEvents.some((e: any) => e.who === attacker.id && e.target === target.id)).toBe(true);
    expect(messagesOf(socketB, 'event').some((e: any) => e.kind === 'round')).toBe(true);

    const snapshot = forceSnapshot(room);
    expect(snapshot.state).toBe('roundEnd');
    expect(snapshot.round).toBe(2);
    expect(snapshot.score).toEqual([1, 0]);
    expect(snapshot.lastWinner).toBe(attacker.id);
    expect(snapshot.bullets).toHaveLength(0);
    const targetSnap = snapshot.players.find((p) => p.id === target.id)!;
    expect(targetSnap.hp).toBe(0);
    expect(targetSnap.alive).toBe(false);
  });

  it('slash dentro do alcance e do arco mata e pontua', () => {
    const { room, sockets, players } = liveArena('SLASH-KILL');
    const [, socketB] = sockets;
    const [attacker, target] = players;
    place(attacker, -1.5, -3, [1, 0]);
    place(target, 0, -3, [0, 1]);

    act(room, attacker, 1, ACTIONS.slash);

    expect(target.hp).toBe(0);
    expect(target.alive).toBe(false);
    expect(room.score).toEqual([1, 0]);
    expect(room.state).toBe('roundEnd');
    expect(room.round).toBe(2);
    expect(attacker.slashCd).toBeCloseTo(DUEL_RULES.slashCooldown, 9);
    expect(attacker.focus).toBeGreaterThan(0);

    const slashEvents = messagesOf(socketB, 'event').filter((e: any) => e.kind === 'slash');
    expect(slashEvents).toHaveLength(1);
    expect(slashEvents[0].who).toBe(attacker.id);
    expect(messagesOf(socketB, 'event').some((e: any) => e.kind === 'hit')).toBe(true);
  });

  it('slash fora do alcance não causa dano', () => {
    const { room, players } = liveArena('SLASH-MISS');
    const [attacker, target] = players;
    place(attacker, -4, -3, [1, 0]);
    place(target, 0, -3, [0, 1]);

    act(room, attacker, 1, ACTIONS.slash);

    expect(target.hp).toBe(1);
    expect(target.alive).toBe(true);
    expect(room.score).toEqual([0, 0]);
    expect(room.state).toBe('live');
  });
});

describe('DuelRoom — foco e special', () => {
  it('special abaixo de 100 de foco não move nem consome', () => {
    const { room, sockets, players } = liveArena('SPECIAL-LOW');
    const [socketA] = sockets;
    const [player, enemy] = players;
    place(player, -2, -3, [1, 0]);
    place(enemy, 0.5, -3, [0, 1]);
    player.focus = DUEL_RULES.focusMax - 1;

    act(room, player, 1, ACTIONS.special);

    expect(player.x).toBe(-2);
    expect(player.z).toBe(-3);
    expect(player.focus).toBe(DUEL_RULES.focusMax - 1);
    expect(player.specialCd).toBe(0);
    expect(enemy.hp).toBe(1);
    expect(room.state).toBe('live');
    expect(messagesOf(socketA, 'event').filter((e: any) => e.kind === 'special')).toHaveLength(0);
  });

  it('special com foco cheio avança, consome foco e erra quem está fora da linha', () => {
    const { room, sockets, players } = liveArena('SPECIAL-MISS');
    const [socketA] = sockets;
    const [player, enemy] = players;
    place(player, -2, -3, [1, 0]);
    place(enemy, 3, -1, [0, 1]);
    player.focus = DUEL_RULES.focusMax;

    act(room, player, 1, ACTIONS.special);

    expect(player.x).toBeCloseTo(-2 + DUEL_RULES.specialRange, 9);
    expect(player.z).toBeCloseTo(-3, 9);
    expect(player.focus).toBe(0);
    expect(player.specialCd).toBeCloseTo(DUEL_RULES.specialCooldown, 9);
    expect(player.invuln).toBeGreaterThanOrEqual(0.7);
    expect(enemy.hp).toBe(1);
    expect(room.state).toBe('live');

    const specialEvents = messagesOf(socketA, 'event').filter((e: any) => e.kind === 'special');
    expect(specialEvents).toHaveLength(1);
    expect(specialEvents[0].who).toBe(player.id);
  });

  it('special com foco cheio acerta em linha, move e mata', () => {
    const { room, sockets, players } = liveArena('SPECIAL-HIT');
    const [, socketB] = sockets;
    const [player, enemy] = players;
    place(player, -2, -3, [1, 0]);
    place(enemy, 0.5, -3, [0, 1]);
    player.focus = DUEL_RULES.focusMax;

    act(room, player, 1, ACTIONS.special);

    expect(player.x).toBeCloseTo(-2 + DUEL_RULES.specialRange, 9);
    expect(player.z).toBeCloseTo(-3, 9);
    expect(enemy.hp).toBe(0);
    expect(enemy.alive).toBe(false);
    expect(room.score).toEqual([1, 0]);
    expect(room.state).toBe('roundEnd');
    // O custo é 100; o abate devolve recompensa, então apenas garantimos que
    // não continua cheio (o consumo em si é coberto pelo teste de miss).
    expect(player.focus).toBeLessThan(DUEL_RULES.focusMax);
    expect(messagesOf(socketB, 'event').some((e: any) => e.kind === 'special')).toBe(true);
    expect(messagesOf(socketB, 'event').some((e: any) => e.kind === 'hit')).toBe(true);
  });

  it('special não atravessa blocos (server/duel-room.ts:523-525)', () => {
    // special soma 3.3 unidades de uma vez e só resolve colisão no destino.
    // Partindo de x=-8,z=-4 (bloco em x[-6.5,-5.5], z[-4.5,-3.5]), o destino
    // x=-4.7 fica do outro lado do bloco: não há sweep/substeps. O mesmo
    // acontece com o pilar central em (0,0).
    const { room, players } = liveArena('SPECIAL-WALL');
    const [player, enemy] = players;
    place(player, -8, -4, [1, 0]);
    place(enemy, 3, -4, [0, 1]);
    player.focus = DUEL_RULES.focusMax;

    act(room, player, 1, ACTIONS.special);

    // Deve parar/deslizar para o lado de origem do bloco, nunca aparecer atrás.
    expect(player.x).toBeLessThanOrEqual(-6.5 - 0.29);
    expect(overlapsAnyCollider(player.x, player.z)).toBe(false);
  });
});
