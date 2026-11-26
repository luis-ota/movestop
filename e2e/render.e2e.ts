/**
 * Browser checks for rendering and GPU-resource reuse:
 * - still screens (pause, briefing) stop redrawing, and draw again when they must;
 * - the menu runs at about 30 fps;
 * - bullets share materials, and a parried bullet does not repaint the others;
 * - effect materials are recycled.
 *
 * Not picked up by `bun test` (the file name has no `.test.`).
 */
import type { Page } from 'playwright';
import { runE2E, type E2EContext } from './harness';

/** Frames the renderer drew during `ms` of wall time. */
async function framesDrawn(page: Page, ms: number): Promise<number> {
  const before = await page.evaluate(() => (window as any).__MOVESTOP__.game.renderer.info.render.frame);
  await page.waitForTimeout(ms);
  const after = await page.evaluate(() => (window as any).__MOVESTOP__.game.renderer.info.render.frame);
  return after - before;
}

async function menuRunsAt30(ctx: E2EContext): Promise<void> {
  const frames = await framesDrawn(ctx.page, 2000);
  // ~60 at 30 fps; well under the 120 a 60 Hz display would draw
  ctx.check('menu desenha a ~30 fps', frames >= 40 && frames <= 75, { quadrosEm2s: frames });
}

async function pauseStopsDrawing({ page, check }: E2EContext): Promise<void> {
  await page.evaluate(() => {
    const m = (window as any).__MOVESTOP__;
    m.startLevel(0);
    m.game.beginPlay();
    m.ui.showHUD();
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  check('jogando desenha todo quadro', (await framesDrawn(page, 1000)) > 45, {});

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.state === 'paused');
  await page.waitForTimeout(2000); // effects end and the camera settles
  const paused = await framesDrawn(page, 1000);
  check('pausado para de desenhar', paused === 0, { quadrosEm1s: paused });

  await page.setViewportSize({ width: 1100, height: 700 });
  const afterResize = await framesDrawn(page, 600);
  check('redimensionar pausado desenha de novo', afterResize > 0, { quadros: afterResize });
  await page.setViewportSize({ width: 1280, height: 760 });

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.state === 'playing');
  const resumed = await framesDrawn(page, 800);
  check('voltar ao jogo desenha de novo', resumed > 30, { quadros: resumed });
}

async function briefingReloadDraws({ page, check }: E2EContext): Promise<void> {
  await page.evaluate(() => (window as any).__MOVESTOP__.startLevel(1));
  await page.waitForFunction(() => (window as any).__MOVESTOP__.game.state === 'briefing');
  await page.waitForTimeout(2000);
  const idle = await framesDrawn(page, 800);
  check('briefing parado não desenha', idle === 0, { quadros: idle });
  // a difficulty change in the briefing reloads the level without leaving 'briefing'
  await page.evaluate(() => (window as any).__MOVESTOP__.startLevel(1));
  const reloaded = await framesDrawn(page, 600);
  check('recarregar a fase no briefing desenha de novo', reloaded > 0, { quadros: reloaded });
}

async function bulletsShareMaterials({ page, check }: E2EContext): Promise<void> {
  await page.evaluate(() => {
    const m = (window as any).__MOVESTOP__;
    m.startLevel(0);
    m.game.beginPlay();
    m.ui.showHUD();
  });
  const result = await page.evaluate(() => {
    const g = (window as any).__MOVESTOP__.game;
    const p = g.player;
    for (let i = 0; i < 40; i++) g.spawnBullet(p.x + 3, p.z - 3, i * 0.1, 0, 'enemy', 0xe23b2e, 0xe23b2e, 0.95, false, null);
    const mine = g.bullets.slice(-40);
    const coreMats = new Set(mine.map((b: any) => b.mesh.children[0].material));
    const geos = new Set(mine.map((b: any) => b.mesh.children[0].geometry));
    g.reflectBullet(mine[0]);
    const parried = mine[0].mesh.children[0].material;
    const other = mine[1].mesh.children[0].material;
    return {
      coreMaterials: coreMats.size,
      coreGeometries: geos.size,
      parriedIsGold: parried.color.getHex() === 0xffd23f,
      othersStayRed: other.color.getHex() === 0xe23b2e && parried !== other,
    };
  });
  check('40 balas iguais usam 1 material e 1 geometria', result.coreMaterials === 1 && result.coreGeometries === 1, result);
  check('bala aparada fica dourada', result.parriedIsGold, result);
  check('aparar uma bala não pinta as outras', result.othersStayRed, result);
}

async function effectMaterialsRecycled({ page, check }: E2EContext): Promise<void> {
  const result = await page.evaluate(() => {
    const fx = (window as any).__MOVESTOP__.game.fx;
    fx.clear();
    const first = new Set<unknown>();
    for (let i = 0; i < 30; i++) fx.ring(0, 0, 0xff0000, 1, 0.5);
    for (const r of fx.rings) first.add(r.mesh.material);
    fx.update(1); // every ring ends and returns its material
    for (let i = 0; i < 30; i++) fx.ring(0, 0, 0x00ff00, 1, 0.5);
    const second = fx.rings.map((r: any) => r.mesh.material);
    const reused = second.filter((m: unknown) => first.has(m)).length;
    const recolored = second.every((m: any) => m.color.getHex() === 0x00ff00);
    fx.clear();
    return { reused, recolored };
  });
  check('anéis reaproveitam materiais', result.reused === 30, result);
  check('material reaproveitado recebe a cor nova', result.recolored, result);
}

await runE2E({
  path: '',
  scenarios: [menuRunsAt30, pauseStopsDrawing, briefingReloadDraws, bulletsShareMaterials, effectMaterialsRecycled],
});
