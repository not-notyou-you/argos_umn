import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { FilterBar, FilterForm, FilterTab, FilterTabs } from '@/components/filter-bar';
import { FilterSelect } from '@/components/filter-select';
import { GalleryGrid } from '@/components/media-view';
import { Container, EmptyState, PageHero, buttonClass } from '@/components/ui';
import { galleryItems, galleryPeriods } from '@/lib/queries';
import { formatDate } from '@/lib/util';

export const dynamic = 'force-dynamic';
const PAGE = 24;

export default async function GalleriesPage({ searchParams }: { searchParams: Promise<{ filter?: string; limit?: string; year?: string; month?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations('gallery');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const filter = params.filter === 'project' || params.filter === 'activity' ? params.filter : 'all';
  const limit = Math.min(Math.max(Number(params.limit) || PAGE, PAGE), 500);
  const periods = await galleryPeriods();
  const years = [...new Set(periods.map((p) => p.year))].sort((a, b) => b - a);
  const year = years.find((y) => y === Number(params.year));
  const months = [...new Set(periods.filter((p) => !year || p.year === year).map((p) => p.month))].sort((a, b) => a - b);
  const month = months.find((m) => m === Number(params.month));
  const { items, hasMore } = await galleryItems(filter, limit, { year, month });
  const monthName = (m: number) => new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, m - 1, 1)));
  const period = { ...(year ? { year } : {}), ...(month ? { month } : {}) };

  const view = items.map(({ media, date, projectName, projectSlug, activityName, activitySlug }) => ({
    ...media,
    caption: projectName ?? activityName ?? undefined,
    href: projectSlug ? `${prefix}/projects/${projectSlug}` : `${prefix}/activities/${activitySlug}`,
    typeLabel: projectSlug ? t('typeProject') : t('typeActivity'),
    dateLabel: formatDate(date, locale),
    monthLabel: monthName(Number(date.slice(5, 7))),
    yearLabel: date.slice(0, 4),
  }));

  const tabs = [
    { value: 'all', label: t('all') },
    { value: 'project', label: t('projects') },
    { value: 'activity', label: t('activities') },
  ];

  return (
    <>
    <PageHero title={t('title')} />
    <Container className="py-12">
      <FilterBar>
        <FilterTabs>
          {tabs.map((tab) => (
            <FilterTab key={tab.value} href={{ pathname: `${prefix}/galleries`, query: { ...(tab.value === 'all' ? {} : { filter: tab.value }), ...period } }} active={filter === tab.value}>{tab.label}</FilterTab>
          ))}
        </FilterTabs>
        <FilterForm hidden={{ filter: filter === 'all' ? undefined : filter }}>
          <FilterSelect name="year" label={t('year')} defaultValue={year ? String(year) : ''} className="flex-1 border-l-0 md:flex-none" options={[{ value: '', label: t('allYears') }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />
          <FilterSelect name="month" label={t('month')} defaultValue={month ? String(month) : ''} className="flex-1 md:flex-none" options={[{ value: '', label: t('allMonths') }, ...months.map((m) => ({ value: String(m), label: monthName(m) }))]} />
        </FilterForm>
      </FilterBar>
      {view.length === 0 ? <EmptyState message={t('empty')} /> : <GalleryGrid items={view} />}
      {hasMore && (
        <div className="pt-8 text-center">
          <Link scroll={false} href={{ pathname: `${prefix}/galleries`, query: { ...(filter === 'all' ? {} : { filter }), ...period, limit: limit + PAGE } }} className={buttonClass('secondary')}>{t('more')}</Link>
        </div>
      )}
    </Container>
    </>
  );
}
