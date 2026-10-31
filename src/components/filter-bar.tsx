import { ArrowRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="filter-bar relative z-30 mb-10 flex flex-wrap items-center gap-2 rounded-md bg-surface-muted/90 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.08)] backdrop-blur-md md:sticky md:top-[84px]">{children}</div>;
}

export function FilterTabs({ children }: { children: ReactNode }) {
  return <div className="flex max-w-full gap-1 overflow-x-auto">{children}</div>;
}

export function FilterTab({ active, count, children, ...props }: ComponentProps<typeof Link> & { active: boolean; count?: number }) {
  return (
    <Link {...props} aria-current={active ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm px-4 text-sm font-semibold transition-colors ${active ? 'bg-brand-orange text-ink' : 'text-brand-dark-gray hover:bg-surface hover:text-heading'}`}>
      {children}
      {count !== undefined && <span className={`text-xs font-bold ${active ? 'text-ink/70' : 'text-brand-light-gray'}`}>{count}</span>}
    </Link>
  );
}

/** Filter tanpa kolom cari; form GET biasa dengan tombol kirim untuk kondisi tanpa JavaScript. */
export function FilterForm({ hidden = {}, children }: { hidden?: Record<string, string | undefined>; children: ReactNode }) {
  const c = useTranslations('common');
  return (
    <form className="search-field flex min-h-11 w-full items-center rounded-sm bg-surface ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-orange md:ml-auto md:w-auto">
      {Object.entries(hidden).map(([name, val]) => val && <input key={name} type="hidden" name={name} value={val} />)}
      {children}
      <button aria-label={c('apply')} className="m-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-ink text-white transition-colors hover:bg-teal-solid"><ArrowRight size={16} aria-hidden /></button>
    </form>
  );
}

/** Kolom pencarian: form GET biasa, sehingga tetap berjalan tanpa JavaScript. */
export function SearchField({ label, value, clearHref, hidden = {}, children }: { label: string; value?: string; clearHref?: ComponentProps<typeof Link>['href']; hidden?: Record<string, string | undefined>; children?: ReactNode }) {
  const c = useTranslations('common');
  return (
    <form role="search" className="search-field group/search flex min-h-11 min-w-0 basis-full items-center rounded-sm bg-surface pl-3 ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-brand-orange md:ml-auto md:max-w-md md:flex-1 md:basis-0">
      {Object.entries(hidden).map(([name, val]) => val && <input key={name} type="hidden" name={name} value={val} />)}
      <Search size={18} aria-hidden className="shrink-0 text-brand-light-gray transition-colors group-focus-within/search:text-orange-text" />
      <input type="search" name="q" defaultValue={value} aria-label={label} placeholder={label} className="min-h-10 w-full min-w-0 bg-transparent px-2 text-heading outline-none placeholder:text-brand-light-gray" />
      {value && clearHref && (
        <Link href={clearHref} aria-label={c('clear')} className="flex size-9 shrink-0 items-center justify-center hover:text-heading"><X size={16} aria-hidden /></Link>
      )}
      {children}
      <button aria-label={c('search')} className="m-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-sm bg-ink text-white transition-colors hover:bg-teal-solid"><ArrowRight size={16} aria-hidden /></button>
    </form>
  );
}
