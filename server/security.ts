/**
 * HTTP/WebSocket boundary helpers.
 *
 * These functions are deliberately small and side-effect free so the security
 * policy is easy to audit. They never trust a client-supplied URL beyond
 * parsing it, never reflect request data into headers, and fail closed when a
 * value does not parse.
 */

import { isIP } from 'node:net';
import type { Server } from 'bun';

export interface OriginPolicy {
  /** Exact, normalized origins (scheme://host[:port]) explicitly allowed. */
  allowedOrigins: ReadonlySet<string>;
  /** In production a missing Origin header is rejected. */
  production: boolean;
  /** Read X-Forwarded-* only when an operator marks the proxy as trusted. */
  trustProxy: boolean;
}

export interface ParsedOrigins {
  origins: Set<string>;
  invalid: number;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Host header made of letters, digits, dots, dashes, colons and IPv6 brackets. */
const HOST_RE = /^[A-Za-z0-9.:\-\[\]]{1,255}$/;

/**
 * Parse a comma-separated ALLOWED_ORIGINS value. Invalid entries are counted
 * but never logged with their value: a bad deploy should not leak config text
 * into logs. Wildcards are intentionally unsupported.
 */
export function parseAllowedOrigins(raw: string | undefined): ParsedOrigins {
  const origins = new Set<string>();
  let invalid = 0;

  if (!raw) return { origins, invalid };

  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value) continue;

    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        invalid += 1;
        continue;
      }
      if (url.username || url.password || url.hostname.includes('*')) {
        invalid += 1;
        continue;
      }
      origins.add(url.origin.toLowerCase());
    } catch {
      invalid += 1;
    }
  }

  return { origins, invalid };
}

/** Strip default HTTP/HTTPS ports so proxy-normalized hosts compare reliably. */
function canonicalHost(host: string): string {
  const value = host.trim().toLowerCase();
  if (value.endsWith(':443')) return value.slice(0, -4);
  if (value.endsWith(':80')) return value.slice(0, -3);
  return value;
}

function sanitizeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const first = raw.split(',')[0]?.trim() ?? '';
  if (!first || !HOST_RE.test(first)) return null;
  return canonicalHost(first);
}

/**
 * The host the browser believes it is talking to. X-Forwarded-Host is only
 * considered when TRUST_PROXY is explicitly enabled, and only its first value
 * is used.
 */
export function effectiveRequestHost(req: Request, trustProxy: boolean): string | null {
  if (trustProxy) {
    const forwarded = sanitizeHost(req.headers.get('x-forwarded-host'));
    if (forwarded) return forwarded;
  }

  return sanitizeHost(req.headers.get('host')) ?? sanitizeHost(new URL(req.url).host);
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return LOCAL_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Origin validation for the WebSocket upgrade. Browsers always send Origin on
 * a WebSocket handshake; non-browser clients may omit it and are accepted only
 * outside production. An Origin is allowed when it matches the allowlist, the
 * host that served the request, or (in development) localhost.
 */
export function isOriginAllowed(origin: string | null, req: Request, policy: OriginPolicy): boolean {
  if (origin === null || origin === '') return !policy.production;

  const raw = origin.trim();
  if (raw === 'null') return false;

  let normalized: string;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    normalized = url.origin.toLowerCase();
  } catch {
    return false;
  }

  // A browser Origin is exactly scheme://host[:port]; reject paths or junk.
  if (raw.toLowerCase() !== normalized) return false;

  if (policy.allowedOrigins.has(normalized)) return true;
  if (!policy.production && isLocalDevOrigin(normalized)) return true;

  const expectedHost = effectiveRequestHost(req, policy.trustProxy);
  if (!expectedHost) return false;

  try {
    const url = new URL(normalized);
    return canonicalHost(url.host) === expectedHost;
  } catch {
    return false;
  }
}

/**
 * Client IP for per-IP connection limits.
 *
 * Default: the kernel/accepted socket address from Bun, which cannot be spoofed
 * by the client. When TRUST_PROXY=1, Cloudflare's CF-Connecting-IP is preferred
 * (the production origin only accepts Cloudflare IPs), then the first
 * X-Forwarded-For address for other trusted proxies; see ONLINE.md.
 */
export function clientIp<T>(req: Request, server: Server<T>, trustProxy: boolean): string {
  if (trustProxy) {
    const cloudflare = req.headers.get('cf-connecting-ip')?.trim() ?? '';
    if (isIP(cloudflare)) return cloudflare.toLowerCase();

    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim() ?? '';
      if (isIP(first)) return first.toLowerCase();
    }
  }

  const address = server.requestIP(req)?.address;
  return address ? address.toLowerCase() : 'unknown';
}

/**
 * CSP tailored to the current Vite build: hashed/self assets, inline style
 * attributes already used by the UI, data/blob images, same-origin fonts, and
 * WebSocket connections. No inline scripts, no eval, no workers, no frames.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' ws: wss:",
  "media-src 'self' blob:",
  "worker-src 'none'",
  "child-src 'none'",
  "manifest-src 'self'",
].join('; ');

export const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=(self)',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'usb=()',
].join(', ');

/** Apply the standard security headers to an existing Headers object. */
export function applySecurityHeaders(headers: Headers): Headers {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', PERMISSIONS_POLICY);
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  return headers;
}

export function securedHeaders(init?: HeadersInit): Headers {
  return applySecurityHeaders(new Headers(init));
}

/** Small plain-text response with the full security header set. */
export function textResponse(
  body: string,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  const headers = securedHeaders({
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  return new Response(body, { status, headers });
}
