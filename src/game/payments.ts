import type { CoinPack } from './catalog';

export interface PurchaseResult {
  ok: boolean;
  provider: 'demo' | 'checkout';
  reference: string;
  /** true when the client still needs to verify a webhook / entitlement server */
  pendingVerification?: boolean;
}

/**
 * Payment boundary.
 *
 * The game is a static SPA, so the default flow is an explicitly labelled
 * DEMO checkout that grants the pack locally. For production, set a hosted
 * checkout URL (Stripe Payment Link / Lemon Squeezy) in VITE_CHECKOUT_BASE,
 * and keep an entitlement endpoint (a tiny serverless function) that verifies
 * the provider webhook before the client marks a purchase as paid.
 *
 * Example:
 *   VITE_CHECKOUT_BASE=https://checkout.example.com/movestop
 *   → https://checkout.example.com/movestop?pack=pack-1300
 */
const CHECKOUT_BASE = (import.meta.env.VITE_CHECKOUT_BASE as string | undefined)?.trim();

export async function purchasePack(pack: CoinPack): Promise<PurchaseResult> {
  if (CHECKOUT_BASE) {
    const url = new URL(CHECKOUT_BASE);
    url.searchParams.set('pack', pack.id);
    url.searchParams.set('utm_source', 'movestop');
    window.open(url.toString(), '_blank', 'noopener');
    return {
      ok: true,
      provider: 'checkout',
      reference: `redirect:${pack.id}`,
      pendingVerification: true,
    };
  }

  // Demo checkout: no network, no charge, instant local grant.
  await new Promise((resolve) => setTimeout(resolve, 1450));
  const ref =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `demo-${Date.now()}`;
  return { ok: true, provider: 'demo', reference: ref };
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
