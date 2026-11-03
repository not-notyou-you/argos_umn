import { ArrowUpRight } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { CSSProperties } from 'react';
import { ActivityRow, CARD_H, YEAR_COLUMN, YEAR_OFFSET, YearTag } from '@/components/activity-row';
import { Cover } from '@/components/display';
import { FilterBar, SearchField } from '@/components/filter-bar';
import { ArgosLogo, Container, EmptyState, PageHero } from '@/components/ui';
import { listActivities } from '@/lib/queries';
import { JOIN_URL, excerpt } from '@/lib/util';

export const dynamic = 'force-dynamic';

/** Jarak atas saat halaman berhenti di sebuah kartu: header (84px) + bar filter yang menempel (60px) + ruang 28px. */
const SNAP_TOP = 172;

/** "2 DESEMBER" atau "2 DECEMBER": tanggal dan nama bulan lengkap; tahunnya tampil di blok tahun. */
const dayMonth = (date: string, locale: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long' });

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
      <PageHero title={t('title')} />
      <Container className="activity-snap py-12">
        <FilterBar>
          <SearchField label={t('search')} value={q} clearHref={`${prefix}/activities`} />
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState message={t('empty')} />
        ) : (
          // Panel daftar di akhir daftar sekaligus memberi ruang agar kartu terakhir bisa digulir sampai sejajar blok tahun.
          <div className="activity-tail flex flex-col gap-16" style={{ '--tail': `${SNAP_TOP + CARD_H}px` } as CSSProperties}>
            {[...years].map(([year, items]) => (
              <section key={year} className="md:grid" style={{ gridTemplateColumns: `${YEAR_COLUMN}px 1fr` }}>
                {/* Di layar sempit tahun cukup jadi judul biasa. */}
                <h2 className="heading-xl mb-6 md:hidden">{year}</h2>
                {/* Ruang bawah = YEAR_OFFSET agar blok tahun berhenti tepat sejajar kartu terakhir tahun itu. */}
                <div className="hidden md:block" style={{ paddingBottom: YEAR_OFFSET }}>
                  <YearTag year={year} top={SNAP_TOP} />
                </div>
                <ol className="flex flex-col gap-8">
                  {items.map(({ activity, coverKey }) => (
                    <li key={activity.id} className="snap-start" style={{ scrollMarginTop: SNAP_TOP }}>
                      <ActivityRow
                        href={`${prefix}/activities/${activity.slug}`}
                        day={dayMonth(activity.activityDate, locale)}
                        title={activity.name}
                        excerpt={excerpt(activity.description)}
                        cover={<Cover storageKey={coverKey} alt="" sizes="300px" className="size-full" kind="activity" />}
                      />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
            {/* Ajakan mendaftar sebagai anggota Argos Club. Di layar lebar tingginya mengisi sisa layar di bawah kartu terakhir. */}
            {/* Panel berbentuk panah seperti kartu aktivitas, dengan logo Argos di kiri. */}
            <div className="activity-join flex items-center">
              <section className="join-arrow w-full bg-brand-orange p-2">
                <div className="join-arrow-inner grid items-center gap-6 bg-surface-muted p-6 md:grid-cols-[200px_1fr] md:py-8 md:pr-36 md:pl-10">
                  <div className="mx-auto w-40 md:w-48">
                    <ArgosLogo width={192} className="h-auto w-full" />
                  </div>
                  <div>
                    <h2 className="text-[clamp(1.75rem,3.4vw,2.75rem)] leading-tight font-extrabold tracking-tight text-heading">{t('joinTitle')}</h2>
                    <p className="mt-3 max-w-[52ch]">{t('joinBody')}</p>
                    <a href={JOIN_URL} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-12 items-center gap-2 bg-brand-light-blue px-6 font-extrabold tracking-wide text-black uppercase transition-colors hover:bg-brand-orange">
                      {t('joinCta')} <ArrowUpRight size={18} aria-hidden />
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
