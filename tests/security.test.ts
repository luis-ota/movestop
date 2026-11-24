import { describe, expect, it } from 'bun:test';
import type { Server } from 'bun';
import { clientIp } from '../server/security';

function fakeServer(address = '198.51.100.9'): Server<unknown> {
  return { requestIP: () => ({ address }) } as unknown as Server<unknown>;
}

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://movestop.wired.rs/healthz', { headers });
}

describe('clientIp', () => {
  it('usa o socket quando o proxy não é confiável', () => {
    const req = requestWith({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '203.0.113.11',
    });
    expect(clientIp(req, fakeServer(), false)).toBe('198.51.100.9');
  });

  it('prefere CF-Connecting-IP atrás de Cloudflare', () => {
    const req = requestWith({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '172.70.1.1, 203.0.113.10',
    });
    expect(clientIp(req, fakeServer(), true)).toBe('203.0.113.10');
  });

  it('cai para o primeiro X-Forwarded-For em proxy confiável', () => {
    const req = requestWith({ 'x-forwarded-for': '203.0.113.20, 172.70.1.1' });
    expect(clientIp(req, fakeServer(), true)).toBe('203.0.113.20');
  });

  it('ignora CF-Connecting-IP inválido e usa X-Forwarded-For válido', () => {
    const req = requestWith({
      'cf-connecting-ip': 'not-an-ip',
      'x-forwarded-for': '2001:db8::1',
    });
    expect(clientIp(req, fakeServer(), true)).toBe('2001:db8::1');
  });

  it('ignora cabeçalhos inválidos e usa o socket', () => {
    const req = requestWith({
      'cf-connecting-ip': 'nope',
      'x-forwarded-for': 'nope, also-nope',
    });
    expect(clientIp(req, fakeServer('2001:db8::9'), true)).toBe('2001:db8::9');
  });
});
