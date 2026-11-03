import { Check, Circle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { TimelineEntry } from '@/lib/queries';
import { formatDate } from '@/lib/util';

/** Tahap terlambat: belum selesai melewati tanggal selesai, atau selesai setelah tanggal itu. */
export function isLate(item: TimelineEntry, today: string) {
  return item.status === 'done' ? Boolean(item.completedAt && item.completedAt > item.endDate) : item.endDate < today;
}

/** Tampilan baca saja: judul, rentang tanggal, status, dan penanda telat. Deskripsi hanya untuk anggota. */
export function TimelineView({ items, today, showDescription = false }: { items: (TimelineEntry & { description?: string })[]; today: string; showDescription?: boolean }) {
  const t = useTranslations('timeline');
  const locale = useLocale();
  if (items.length === 0) return <p>{t('empty')}</p>;
  const done = items.filter((i) => i.status === 'done').length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-[22px]">{t('progress', { done, total: items.length })}</p>
      <ol className="flex flex-col">
        {items.map((item) => {
          const late = isLate(item, today);
          return (
            <li key={item.id} className="flex gap-3 border-b border-line py-3 last:border-b-0">
              {item.status === 'done' ? (
                <Check size={20} aria-hidden className="mt-0.5 shrink-0 text-teal-text" />
              ) : (
                <Circle size={20} aria-hidden className="mt-0.5 shrink-0 text-brand-light-gray" />
              )}
              <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold text-heading">{item.title}</p>
                <p className="text-sm leading-[22px]">
                  {formatDate(item.startDate, locale)} – {formatDate(item.endDate, locale)}
                  {' · '}
                  {item.status === 'done' && item.completedAt ? t('completedOn', { date: formatDate(item.completedAt, locale) }) : t(item.status)}
                  {late && <span className="ml-2 font-semibold text-danger">{t('late')}</span>}
                </p>
                {showDescription && item.description && <p className="prose-text">{item.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
