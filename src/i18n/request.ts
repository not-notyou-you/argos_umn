import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  // Halaman publik memakai locale dari URL; area login memakai cookie.
  const fromRoute = await requestLocale;
  const fromCookie = (await cookies()).get('NEXT_LOCALE')?.value;
  const locale = isLocale(fromRoute) ? fromRoute : isLocale(fromCookie) ? fromCookie : defaultLocale;
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
