import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import './globals.css';

const montserrat = localFont({
  src: [
    { path: './fonts/Montserrat-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Montserrat-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Montserrat-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Montserrat-ExtraBold.woff', weight: '800', style: 'normal' },
  ],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000'),
  title: { default: 'Argos Club @ UMN', template: '%s · Argos Club @ UMN' },
  description: 'Argos Club @ UMN, part of the Argos Clubs by The IO Foundation.',
  openGraph: { images: ['/brand/argos-logo.png'] },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  // Tanpa cookie, tema mengikuti sistem lewat CSS. Dibaca di server karena CSP melarang skrip inline.
  const saved = (await cookies()).get('theme')?.value;
  const theme = saved === 'light' || saved === 'dark' ? saved : undefined;
  return (
    <html lang={locale} data-theme={theme} className={montserrat.variable}>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
