import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);
const secret = process.env.ORIGIN_SHARED_SECRET;

export function proxy(request: NextRequest) {
  // Pada Fase B URL tunnel bersifat publik, jadi hanya Worker yang boleh masuk.
  if (secret && request.headers.get('x-origin-secret') !== secret) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const { pathname } = request.nextUrl;
  const isPublicPage =
    !/^\/(api|media|_next|login|me|committee|account)(\/|$)/.test(pathname) && !/\.[\w]+$/.test(pathname);
  return isPublicPage ? intl(request) : NextResponse.next();
}

export const config = { matcher: '/((?!_next/static|_next/image).*)' };
