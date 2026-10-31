import { getLocale, getTranslations } from 'next-intl/server';
import { ContentCard } from '@/components/display';
import { Container, EmptyState, PageHeader } from '@/components/ui';
import { listActivities } from '@/lib/queries';
import { formatDate } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getTranslations('activity');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const rows = await listActivities({ q: q?.slice(0, 80) });

  const years = new Map<string, typeof rows>();
  for (const row of rows) {
    const year = row.activity.activityDate.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), row]);
  }

  return (
    <Container className="py-12">
      <PageHeader title={t('title')} intro={t('intro')} />
      <form role="search" className="flex gap-2 pb-6">
        <input name="q" defaultValue={q} aria-label={t('search')} placeholder={t('search')} className="input max-w-56" />
        <button className="sr-only">{c('search')}</button>
      </form>
      {rows.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="flex flex-col gap-10">
          {[...years].map(([year, items]) => (
            <section key={year}>
              <h2 className="pb-4 text-2xl leading-8 font-bold">{year}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map(({ activity, coverKey, logoKey }) => (
                  <ContentCard key={activity.id} href={`${prefix}/activities/${activity.slug}`} name={activity.name} description={activity.description} coverKey={coverKey} logoKey={logoKey} meta={<p className="text-sm">{formatDate(activity.activityDate, locale)}</p>} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
