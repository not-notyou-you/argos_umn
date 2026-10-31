import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';
import { Footer, Header } from '@/components/shell';
import { isLocale } from '@/i18n/config';

export default async function PublicLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense><Header /></Suspense>
      <main id="content" className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
