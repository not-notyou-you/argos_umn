'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { LanguageSwitch } from './language-switch';

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        aria-expanded={open}
        aria-label={open ? t('close') : t('menu')}
        onClick={() => setOpen(!open)}
        className="flex size-11 cursor-pointer items-center justify-center text-ink"
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <nav aria-label={t('menu')} className="absolute inset-x-0 top-16 border-b border-line bg-white p-4 shadow-md">
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center font-semibold text-ink">{item.label}</Link>
              </li>
            ))}
          </ul>
          <Suspense><LanguageSwitch /></Suspense>
        </nav>
      )}
    </div>
  );
}
