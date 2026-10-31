'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function ThemeToggle() {
  const t = useTranslations('nav');
  const toggle = () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = isDark ? 'light' : 'dark';
    root.dataset.theme = next;
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  };
  return (
    <button type="button" onClick={toggle} aria-label={t('theme')} title={t('theme')} className="flex size-11 cursor-pointer items-center justify-center rounded-sm hover:bg-white/10">
      <Moon size={20} aria-hidden className="theme-light-only" />
      <Sun size={20} aria-hidden className="theme-dark-only" />
    </button>
  );
}
