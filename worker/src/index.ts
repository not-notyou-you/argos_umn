import { MAINTENANCE_HTML } from './maintenance';

type Env = {
  /** Fase A: binding Workers VPC ke aplikasi. */
  ORIGIN?: { fetch: (input: Request | string, init?: RequestInit) => Promise<Response> };
  /** Fase A: URL internal aplikasi lewat tunnel. */
  ORIGIN_URL?: string;
  /** Fase B: KV berisi kunci `origin_url` yang diperbarui skrip di server. */
  CONFIG?: { get: (key: string) => Promise<string | null> };
  ORIGIN_SHARED_SECRET?: string;
};

const maintenance = () =>
  new Response(MAINTENANCE_HTML, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '300', 'Cache-Control': 'no-store' },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const incoming = new URL(request.url);
    const base = env.ORIGIN ? (env.ORIGIN_URL ?? 'http://app:3000') : await env.CONFIG?.get('origin_url');
    if (!base) return maintenance();

    const target = new URL(incoming.pathname + incoming.search, base);
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', incoming.host);
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '');
    if (env.ORIGIN_SHARED_SECRET) headers.set('X-Origin-Secret', env.ORIGIN_SHARED_SECRET);

    // Body diteruskan sebagai stream agar tidak memakai jatah CPU Worker.
    const forwarded = new Request(target, { method: request.method, headers, body: request.body, redirect: 'manual' });
    const isPage = request.method === 'GET' && (request.headers.get('Accept') ?? '').includes('text/html');

    try {
      const response = await (env.ORIGIN ? env.ORIGIN.fetch(forwarded) : fetch(forwarded));
      if (isPage && response.status >= 502 && response.status <= 504) return maintenance();
      return response;
    } catch {
      return isPage ? maintenance() : new Response('Service unavailable', { status: 503 });
    }
  },
};
