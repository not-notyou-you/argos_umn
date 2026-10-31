'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import { setLocaleAction } from '@/actions/auth';

export function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const path = `${pathname}${search ? `?${search}` : ''}`;
  return (
    <form action={setLocaleAction} aria-label={t('language')} className="flex text-sm font-semibold">
      <input type="hidden" name="path" value={path} />
      {(['id', 'en'] as const).map((value) => (
        <button
          key={value}
          name="locale"
          value={value}
          aria-pressed={locale === value}
          className={`min-h-11 min-w-11 cursor-pointer px-1 uppercase ${
            locale === value ? (dark ? 'text-brand-orange' : 'text-orange-text underline underline-offset-4') : ''
          }`}
        >
          {value}
        </button>
      ))}
    </form>
  );
}
