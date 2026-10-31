import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const secret = process.env.ORIGIN_SHARED_SECRET;
const isHttps = process.env.PUBLIC_BASE_URL?.startsWith('https://');

function contentSecurityPolicy(nonce: string) {
  const dev = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${dev}`,
    // Atribut style dipakai ukuran avatar dan oleh next/font.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    'frame-src https://www.youtube-nocookie.com https://drive.google.com',
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export function proxy(request: NextRequest) {
  // Pada Fase B URL tunnel bersifat publik, jadi hanya Worker yang boleh masuk.
  if (secret && request.headers.get('x-origin-secret') !== secret) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  // Next.js membaca nonce dari header CSP pada request.
  const headers = new Headers(request.headers);
  headers.set('content-security-policy', csp);

  const { pathname } = request.nextUrl;
  const isPublicPage =
    !/^\/(api|media|_next|login|me|committee|account)(\/|$)/.test(pathname) && !/\.[\w]+$/.test(pathname);
  const response = isPublicPage ? intl(new NextRequest(request, { headers })) : NextResponse.next({ request: { headers } });

  response.headers.set('Content-Security-Policy', csp);
  if (isHttps) response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return response;
}

export const config = { matcher: '/((?!_next/static|_next/image).*)' };
