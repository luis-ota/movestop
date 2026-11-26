/**
 * Browser checks for the dev sandbox enemies (Estátua and Sombra).
 *
 *   bun run test:e2e
 *
 * Opens `/?sandbox` and drives the game through the dev-only `__MOVESTOP__`
 * handle. See e2e/harness.ts for how the server and browser are started.
 *
 * Not picked up by `bun test` (the file name has no `.test.`).
 */
import type { Page } from 'playwright';
import { runE2E, type E2EContext, type Scenario } from './harness';

let check: E2EContext['check'] = () => {};

/** Adapts a (page) scenario to the harness, keeping its name for error reports. */
function scenario(fn: (page: Page) => Promise<void>): Scenario {
  const run: Scenario = async (ctx) => {
    check = ctx.check;
    await fn(ctx.page);
  };
  Object.defineProperty(run, 'name', { value: fn.name });
  return run;
}

// ---------------------------------------------------------------- page helpers
// Everything below runs against window.__MOVESTOP__ (exposed only in dev builds).

async function resetArena(page: Page, invulnerable: boolean): Promise<void> {
  await page.evaluate((inv) => {
    const g = (window as any).__MOVESTOP__.game;
    g.sandboxClear();
    g.setSandboxOption('invulnerable', inv);
    g.setSandboxOption('infiniteAmmo', true);
  }, invulnerable);
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.state === 'playing');
}

/** Spawns `type` at an offset from the player, already past its spawn grace. */
async function spawnNear(page: Page, type: string, dx: number, dz: number): Promise<void> {
  await page.evaluate(
    ([t, x, z]) => {
      const g = (window as any).__MOVESTOP__.game;
      const p = g.player;
      // sandboxSpawn('cursor') reads the aim point; it is set right before the call
      p.aimX = p.x + (x as number);
      p.aimZ = p.z + (z as number);
      g.sandboxSpawn(t, 'cursor');
      const e = g.enemies.filter((n: any) => n.alive && n.type === t).pop();
      e.grace = 0;
    },
    [type, dx, dz] as const,
  );
}

async function enemy(page: Page, type: string) {
  return page.evaluate((t) => {
    const g = (window as any).__MOVESTOP__.game;
    const e = g.enemies.find((n: any) => n.alive && n.type === t);
    if (!e) return null;
    return { x: e.x, z: e.z, hp: e.hp, visibility: e.visibility, windup: e.windup, attackKind: e.attackKind };
  }, type);
}

async function counters(page: Page) {
  return page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    return { kills: g.kills, deaths: g.deaths, state: g.state };
  });
}

/** Moves the real mouse over an enemy, so the game's own aiming points at it. */
async function pointAt(page: Page, type: string): Promise<boolean> {
  const screen = await page.evaluate((t) => {
    const g = (window as any).__MOVESTOP__.game;
    const e = g.enemies.find((n: any) => n.alive && n.type === t);
    if (!e) return null;
    // the game aims on a plane 0.55 above the ground
    const v = g.camera.position.clone().set(e.x, 0.55, e.z).project(g.camera);
    return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
  }, type);
  if (!screen) return false;
  await page.mouse.move(screen.x, screen.y);
  // the game reads the mouse on its next frame; on a busy machine that can take
  // a while, so wait until its aim really points at the target
  await page
    .waitForFunction(
      (t) => {
        const g = (window as any).__MOVESTOP__.game;
        const p = g.player;
        const e = g.enemies.find((n: any) => n.alive && n.type === t);
        if (!e) return true;
        const want = Math.atan2(e.x - p.x, e.z - p.z);
        const aim = Math.atan2(p.aimX - p.x, p.aimZ - p.z);
        const diff = Math.abs(Math.atan2(Math.sin(want - aim), Math.cos(want - aim)));
        return diff < 0.08;
      },
      type,
      { timeout: 3000 },
    )
    .catch(() => {});
  return true;
}

/**
 * Fires a few shots at `type`, moving between them so the bullets fly. Bullets
 * freeze with the world, so it keeps walking until every player bullet has
 * landed; stopping early used to leave shots hanging in the air (a flaky miss).
 */
async function shootAt(page: Page, type: string, shots: number): Promise<void> {
  for (let i = 0; i < shots; i++) {
    if (!(await pointAt(page, type))) break;
    await page.waitForTimeout(60); // one frame for the aim to follow the mouse
    await page.keyboard.press('Space');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(220);
    await page.keyboard.up('KeyA');
    await page.waitForTimeout(80);
  }
  await page.keyboard.down('KeyD');
  await page
    .waitForFunction(
      () => !(window as any).__MOVESTOP__.game.bullets.some((b: any) => b.alive && b.owner === 'player'),
      null,
      { timeout: 3000 },
    )
    .catch(() => {});
  await page.keyboard.up('KeyD');
}

const dist = (a: { x: number; z: number } | null, b: { x: number; z: number } | null) =>
  a && b ? Math.hypot(a.x - b.x, a.z - b.z) : NaN;

// ---------------------------------------------------------------- scenarios

async function statueClock(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'statue', 0, -7);

  const a = await enemy(page, 'statue');
  await page.waitForTimeout(1200);
  const b = await enemy(page, 'statue');
  check('Estátua anda com o jogador parado', dist(a, b) > 0.6, { metros: dist(a, b) });

  await page.keyboard.down('KeyD');
  await page.waitForTimeout(450); // time scale ramps up
  const c = await enemy(page, 'statue');
  await page.waitForTimeout(600);
  const d = await enemy(page, 'statue');
  await page.keyboard.up('KeyD');
  check('Estátua congela com o jogador andando', dist(c, d) < 0.05, { metros: dist(c, d) });
}

async function bulletsVsStone(page: Page): Promise<void> {
  // control: the same aiming must kill a gunner, otherwise the statue result means nothing
  await resetArena(page, true);
  await spawnNear(page, 'gunner', 0, -5);
  const before = await counters(page);
  await shootAt(page, 'gunner', 4);
  const after = await counters(page);
  const aimWorks = after.kills > before.kills;
  check('controle: a mesma mira mata um Atirador', aimWorks, { abates: after.kills - before.kills });

  await resetArena(page, true);
  await spawnNear(page, 'statue', 0, -5);
  const s0 = await enemy(page, 'statue');
  await shootAt(page, 'statue', 4);
  const s1 = await enemy(page, 'statue');
  check('Estátua não leva dano de bala', aimWorks && s1 !== null && s1.hp === s0?.hp, { hpAntes: s0?.hp, hpDepois: s1?.hp });
}

async function statueGrab(page: Page): Promise<void> {
  await resetArena(page, false);
  await spawnNear(page, 'statue', 0, -1);
  const before = await counters(page);
  await page.waitForTimeout(1800);
  const after = await counters(page);
  check('agarrão da Estátua acerta quem fica parado', after.deaths > before.deaths, { mortes: after.deaths - before.deaths });
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.state === 'playing', null, { timeout: 5000 });
  check('sandbox faz o jogador renascer', true, { estado: 'playing' });
}

async function ninjaCloak(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ninja', 5, -5);
  await page.waitForTimeout(400);
  const still = await enemy(page, 'ninja');
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(500);
  const moving = await enemy(page, 'ninja');
  const radar = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const e = g.enemies.find((n: any) => n.alive && n.type === 'ninja');
    return e.visibility >= e.def.cloak.radarAbove;
  });
  await page.keyboard.up('KeyS');
  check('Sombra visível com o tempo parado', (still?.visibility ?? 0) > 0.95, { visibilidade: still?.visibility });
  check('Sombra some com o tempo andando', (moving?.visibility ?? 1) < 0.25, { visibilidade: moving?.visibility });
  check('Sombra some do radar quando escondida', !radar, { noRadar: radar });
}

async function ninjaStrike(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ninja', 0, -1.2);
  // short nudges so world time reaches the strike trigger, then stand still;
  // repeated (not one long press) so a slow machine cannot let the strike land
  const striking = () =>
    page.evaluate(() => {
      const g = (window as any).__MOVESTOP__.game;
      const e = g.enemies.find((n: any) => n.alive && n.type === 'ninja');
      return Boolean(e && e.attackKind === 'strike' && e.windup > 0);
    });
  for (let i = 0; i < 25 && !(await striking()); i++) {
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(80);
    await page.keyboard.up('KeyA');
    await page.waitForTimeout(250);
  }
  if (!(await striking())) throw new Error('a Sombra não começou o golpe');
  // the world slows down smoothly; wait until it has fully stopped
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.timeScale === 0, null, { timeout: 3000 });
  const a = await enemy(page, 'ninja');
  await page.waitForTimeout(700);
  const b = await enemy(page, 'ninja');
  check('golpe da Sombra congela com o tempo parado', a !== null && b !== null && a.windup === b.windup, {
    windupA: a?.windup,
    windupB: b?.windup,
  });
  check('golpe da Sombra aparece por inteiro', (b?.visibility ?? 0) > 0.95, { visibilidade: b?.visibility });
}

async function ninjaParry(page: Page): Promise<void> {
  await resetArena(page, false);
  await spawnNear(page, 'ninja', 0, -1.2);
  await pointAt(page, 'ninja');
  await page.waitForTimeout(60);
  const before = await counters(page);
  // open the parry window first, then make the strike land a frame or two later,
  // so the check is about "parry kills the ninja", not about frame timing
  await page.keyboard.press('KeyE');
  await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const p = g.player;
    const e = g.enemies.find((n: any) => n.alive && n.type === 'ninja');
    e.attackKind = 'strike';
    e.windupClock = 'real';
    e.windup = 0.03;
    e.windupMax = 0.5;
    e.aimAngle = Math.atan2(p.x - e.x, p.z - e.z);
  });
  await page.waitForTimeout(250);
  const after = await counters(page);
  check('aparar o golpe mata a Sombra', after.kills > before.kills && after.deaths === before.deaths, {
    abates: after.kills - before.kills,
    mortes: after.deaths - before.deaths,
  });
}

// ---------------------------------------------------------------- ronin and boss

async function ronin(page: Page) {
  return page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
    if (!e) return null;
    return { x: e.x, z: e.z, hp: e.hp, phase: e.ronin.phase, mode: e.ronin.mode, attack: e.ronin.attack };
  });
}

/** Puts the ronin in a given state, e.g. the vulnerable recovery after his heavy cut. */
async function setRonin(page: Page, patch: Record<string, unknown>, hp?: number): Promise<void> {
  await page.evaluate(
    ([p, h]) => {
      const g = (window as any).__MOVESTOP__.game;
      const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
      Object.assign(e.ronin, p);
      if (typeof h === 'number') e.hp = h;
    },
    [patch, hp] as const,
  );
}

/** One katana swing aimed at the ronin. */
async function slashRonin(page: Page): Promise<void> {
  await pointAt(page, 'ronin');
  await page.waitForTimeout(60);
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(80);
}

async function roninParriesBullets(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ronin', 0, -6);
  const before = await ronin(page);
  await shootAt(page, 'ronin', 4);
  const after = await ronin(page);
  check('Ronin apara todas as balas', after !== null && after.hp === before?.hp && after.phase === 1, {
    hpAntes: before?.hp,
    hpDepois: after?.hp,
  });
  const bar = await page.evaluate(() => (window as any).__MOVESTOP__.game.bossBar());
  check('Ronin aparece na barra de chefe com 6 acertos', bar.max === 6 && bar.hp === 6, bar);
}

async function roninShurikenFan(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ronin', 0, -6);
  const fan = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const p = g.player;
    const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
    const t = e.ronin.tuning;
    const before = new Set(g.bullets);
    g.startRoninAttack(e, e.ronin, 'shuriken', Math.atan2(p.x - e.x, p.z - e.z));
    g.releaseRoninAttack(e, e.ronin, Math.hypot(p.x - e.x, p.z - e.z));
    const stars = g.bullets.filter((b: any) => !before.has(b));
    const angles = stars.map((b: any) => Math.atan2(b.vx, b.vz)).sort((a: number, b: number) => a - b);
    const gaps = angles.slice(1).map((a: number, i: number) => a - angles[i]);
    return {
      count: stars.length,
      expected: t.shuriken.count[0],
      fromCentre: stars.map((b: any) => +Math.hypot(b.x - e.x, b.z - e.z).toFixed(3)),
      throwOffset: t.throwOffset,
      gaps: gaps.map((x: number) => +x.toFixed(3)),
      spread: t.shuriken.spread,
    };
  });
  check(
    'shurikens saem a throwOffset do centro',
    fan.count === fan.expected && fan.fromCentre.every((d: number) => Math.abs(d - fan.throwOffset) < 0.01),
    fan,
  );
  check('shurikens espaçadas pelo spread', fan.gaps.every((gap: number) => Math.abs(gap - fan.spread) < 0.01), fan);
}

async function roninOnlyHurtWhenOpen(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ronin', 0, -1.7);
  await setRonin(page, { mode: 'stalk', cooldown: 99 });
  await slashRonin(page);
  const guarded = await ronin(page);
  check('fora da abertura o corte é bloqueado', guarded?.hp === 3, { hp: guarded?.hp });

  await page.waitForTimeout(350); // slash cooldown
  await setRonin(page, { mode: 'recover', timer: 2, timerMax: 2 });
  await slashRonin(page);
  const hit = await ronin(page);
  check('depois do golpe pesado o corte acerta e ele dá o dash', hit?.hp === 2 && hit?.mode === 'dash', hit);

  // the dash and the volley run in world time: keep moving until the arrows are out
  const arrowsBefore = await page.evaluate(() => (window as any).__MOVESTOP__.game.bullets.filter((b: any) => b.alive && b.owner === 'enemy').length);
  await page.keyboard.down('KeyS');
  await page.waitForFunction(
    () => {
      const g = (window as any).__MOVESTOP__.game;
      const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
      return e && e.ronin.mode === 'stalk';
    },
    null,
    { timeout: 5000 },
  );
  await page.keyboard.up('KeyS');
  const shots = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    return g.bullets.filter((b: any) => b.alive && b.owner === 'enemy').length;
  });
  check('após o dash ele atira a rajada de flechas', shots - arrowsBefore >= 1, { flechasNoAr: shots - arrowsBefore });
}

async function roninPhaseTwo(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ronin', 0, -1.7);
  await setRonin(page, { mode: 'recover', timer: 2, timerMax: 2 }, 1);
  await slashRonin(page);
  const r = await ronin(page);
  check('o último acerto da fase 1 abre a fase 2 com 3 acertos', r?.phase === 2 && r?.hp === 3, r);
  const bar = await page.evaluate(() => (window as any).__MOVESTOP__.game.bossBar());
  check('barra mostra a fase 2', bar.hp === 3 && bar.name.includes('II'), bar);
}

async function roninCreepsOnlyInPhaseTwo(page: Page): Promise<void> {
  for (const phase of [1, 2] as const) {
    await resetArena(page, true);
    await spawnNear(page, 'ronin', 0, -7);
    await setRonin(page, { phase, mode: 'stalk', cooldown: 99 });
    await page.waitForFunction(() => (window as any).__MOVESTOP__.game.timeScale === 0, null, { timeout: 3000 });
    const a = await ronin(page);
    await page.waitForTimeout(1000);
    const b = await ronin(page);
    const moved = dist(a, b);
    if (phase === 1) check('fase 1: parado com o tempo parado', moved < 0.02, { metros: moved });
    else check('fase 2: avança devagar com o tempo parado', moved > 0.4 && moved < 1.5, { metros: moved });
  }
}

async function roninHeavyCut(page: Page): Promise<void> {
  await resetArena(page, true);
  await spawnNear(page, 'ronin', 0, -2);
  await setRonin(page, { mode: 'stalk', cooldown: 0, phase: 1 });
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyA');
  await page.waitForFunction(
    () => {
      const g = (window as any).__MOVESTOP__.game;
      const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
      return e && e.ronin.mode === 'windup';
    },
    null,
    { timeout: 4000 },
  );
  const marked = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
    return { attack: e.ronin.attack, area: e.ronin.marks.heavy.visible };
  });
  check('o golpe pesado marca a área no chão', marked.attack === 'heavy' && marked.area, marked);
  await page.keyboard.down('KeyD');
  await page.waitForFunction(
    () => {
      const g = (window as any).__MOVESTOP__.game;
      const e = g.enemies.find((n: any) => n.alive && n.type === 'ronin');
      return e && e.ronin.mode === 'recover';
    },
    null,
    { timeout: 5000 },
  );
  await page.keyboard.up('KeyD');
  check('depois do golpe pesado ele fica vulnerável', true, { modo: 'recover' });
}

async function finalBossInSandbox(page: Page): Promise<void> {
  await resetArena(page, true);
  await page.keyboard.press('KeyB');
  const spawned = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    return { alive: Boolean(g.boss?.alive), bar: g.bossBar() };
  });
  check('tecla B cria o Relojoeiro', spawned.alive && spawned.bar.name === 'O Relojoeiro', spawned);
  const killed = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    g.boss.hp = 1;
    g.damageBoss();
    return { state: g.state, bossAlive: g.boss.alive };
  });
  check('matar o chefe no sandbox não encerra a arena', killed.state === 'playing' && !killed.bossAlive, killed);
  await page.evaluate(() => (window as any).__MOVESTOP__.game.sandboxClear());
  const cleared = await page.evaluate(() => (window as any).__MOVESTOP__.game.boss);
  check('limpar arena remove o chefe', cleared === null, {});
}

// ---------------------------------------------------------------- runner

async function sandboxLoaded(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.isSandbox(), null, { timeout: 15000 });
}

await runE2E({
  path: '?sandbox',
  scenarios: [
    sandboxLoaded,
    statueClock,
    bulletsVsStone,
    statueGrab,
    ninjaCloak,
    ninjaStrike,
    ninjaParry,
    roninParriesBullets,
    roninShurikenFan,
    roninOnlyHurtWhenOpen,
    roninPhaseTwo,
    roninCreepsOnlyInPhaseTwo,
    roninHeavyCut,
    finalBossInSandbox,
  ].map(scenario),
});
