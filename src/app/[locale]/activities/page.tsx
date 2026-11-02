import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Cover } from '@/components/display';
import { FilterBar, SearchField } from '@/components/filter-bar';
import { Container, EmptyState, PageHero } from '@/components/ui';
import { listActivities } from '@/lib/queries';
import { excerpt, formatDate } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getTranslations('activity');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const rows = await listActivities({ q: q?.slice(0, 80) });

  const years = new Map<string, typeof rows>();
  for (const row of rows) {
    const year = row.activity.activityDate.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), row]);
  }

  return (
    <>
      <PageHero title={t('title')} intro={t('intro')} />
      <Container className="py-12">
        <FilterBar>
          <SearchField label={t('search')} value={q} clearHref={`${prefix}/activities`} />
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          <div className="flex flex-col gap-14">
            {[...years].map(([year, items]) => (
              <section key={year} className="grid gap-6 lg:grid-cols-[200px_1fr]">
                <h2 className="heading-xl lg:sticky lg:top-24 lg:self-start">{year}</h2>
                <ol className="flex flex-col">
                  {items.map(({ activity, coverKey }) => (
                    <li key={activity.id} className="reveal group relative grid items-center gap-5 border-t border-line py-6 md:grid-cols-[150px_1fr_260px]">
                      <p className="font-semibold text-teal-text">{formatDate(activity.activityDate, locale)}</p>
                      <div>
                        <h3 className="text-[clamp(1.5rem,2.6vw,2.25rem)] leading-tight font-bold">
                          <Link href={`${prefix}/activities/${activity.slug}`} className="after:absolute after:inset-0 group-hover:text-teal-text">{activity.name}</Link>
                        </h3>
                        <p className="mt-2 line-clamp-2">{excerpt(activity.description)}</p>
                      </div>
                      <div className="overflow-hidden rounded-md">
                        <Cover storageKey={coverKey} alt="" sizes="(min-width: 768px) 260px, 100vw" className="zoom-img aspect-[16/10] w-full" kind="activity" title={activity.name} />
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
