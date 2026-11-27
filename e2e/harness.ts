/**
 * Shared runner for the browser checks in e2e/.
 *
 * Starts its own Vite dev server on a free port and opens the game in a
 * headless browser, then runs each scenario and exits non-zero if any check
 * failed.
 *
 * Browser: Google Chrome by default. PW_CHANNEL picks another installed one
 * (msedge, chrome-beta…); PW_CHANNEL=bundled uses Playwright's own Chromium
 * (bunx playwright install chromium). Without Chrome installed it falls back
 * to the bundled Chromium. Set E2E_HEADED=1 to watch it run.
 */
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type Page } from 'playwright';

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

export interface E2EContext {
  page: Page;
  base: string;
  check(name: string, ok: boolean, detail: unknown): void;
}

export type Scenario = (ctx: E2EContext) => Promise<void>;

/**
 * Chrome first (what most players use), unless PW_CHANNEL says otherwise;
 * Playwright's bundled Chromium when Chrome is not installed.
 */
async function launchBrowser(): Promise<Browser> {
  const headless = process.env.E2E_HEADED !== '1';
  const wanted = process.env.PW_CHANNEL?.trim() || 'chrome';
  const channel = wanted === 'bundled' ? undefined : wanted;
  try {
    return await chromium.launch({ channel, headless });
  } catch (error) {
    if (channel === 'chrome' && !process.env.PW_CHANNEL) {
      console.warn('Google Chrome não encontrado; usando o Chromium do Playwright.');
      try {
        return await chromium.launch({ headless });
      } catch {
        /* fall through to the message below */
      }
    }
    console.error(
      'Não foi possível abrir um navegador.\n' +
        '  Instale o Google Chrome, ou o Chromium do Playwright:  bunx playwright install chromium\n' +
        '  ou escolha outro navegador instalado:  PW_CHANNEL=msedge\n',
    );
    throw error;
  }
}

export async function runE2E(options: { path: string; scenarios: Scenario[] }): Promise<never> {
  const checks: Check[] = [];
  const check = (name: string, ok: boolean, detail: unknown): void => {
    checks.push({ name, ok, detail: JSON.stringify(detail) });
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ${JSON.stringify(detail)}`);
  };

  let server: ViteDevServer | null = null;
  let browser: Browser | null = null;
  try {
    server = await createServer({
      logLevel: 'error',
      server: { host: '127.0.0.1', port: 5199, strictPort: false },
    });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (!base) throw new Error('o servidor Vite não informou uma URL local');

    browser = await launchBrowser();
    console.log(`navegador: ${browser.browserType().name()} ${browser.version()}`);

    const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // the first load compiles the app on the fly: give a busy machine (or a dev
    // server already running on the same Vite cache) time, then wait for the game
    // itself rather than for network silence
    const LOAD_TIMEOUT = 120_000;
    await page.goto(new URL(options.path, base).toString(), { waitUntil: 'load', timeout: LOAD_TIMEOUT });
    await page.waitForFunction(() => (window as any).__MOVESTOP__?.game, null, { timeout: LOAD_TIMEOUT });
    await page.waitForTimeout(600);

    const ctx: E2EContext = { page, base, check };
    for (const scenario of options.scenarios) {
      try {
        await scenario(ctx);
      } catch (error) {
        check(`${scenario.name} terminou sem exceção`, false, String(error));
      }
    }
    check('nenhum erro na página', pageErrors.length === 0, pageErrors);
  } finally {
    await browser?.close();
    await server?.close();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} verificações passaram`);
  process.exit(failed.length > 0 ? 1 : 0);
}
