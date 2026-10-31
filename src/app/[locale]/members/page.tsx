import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Avatar } from '@/components/display';
import { Container, EmptyState, PageHero } from '@/components/ui';
import { latestPosition, listMembers, memberCounts, positionsFor, publicCohorts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; cohort?: string }> }) {
  const { tab, q, cohort } = await searchParams;
  const t = await getTranslations('member');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const status = tab === 'offboarded' ? 'offboarded' : 'onboarded';
  const cohortNumber = Number(cohort) || undefined;

  const [rows, counts, cohorts] = await Promise.all([listMembers(status, q?.slice(0, 80), cohortNumber), memberCounts(), publicCohorts()]);
  const positions = await positionsFor(rows.map((r) => r.id));

  return (
    <>
    <PageHero title={t('title')} intro={t('intro')} meta={t('count', { n: counts.onboarded + counts.offboarded })} />
    <Container className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex gap-2">
          {(['onboarded', 'offboarded'] as const).map((value) => (
            <Link
              key={value}
              href={{ pathname: `${prefix}/members`, query: value === 'offboarded' ? { tab: value } : {} }}
              aria-current={status === value ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-sm border px-3 font-semibold ${status === value ? 'border-teal-text bg-teal-text text-white' : 'border-line hover:border-teal-text'}`}
            >
              {t(value)} ({counts[value]})
            </Link>
          ))}
        </div>
        <form role="search" className="flex flex-wrap gap-2">
          {status === 'offboarded' && <input type="hidden" name="tab" value="offboarded" />}
          <input name="q" defaultValue={q} aria-label={t('search')} placeholder={t('search')} className="input max-w-48" />
          <select name="cohort" defaultValue={cohort} aria-label={t('cohort')} className="input max-w-44">
            <option value="">{t('allCohorts')}</option>
            {cohorts.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <button className="min-h-11 cursor-pointer rounded-sm border border-teal-text px-3 font-semibold text-teal-text">{c('search')}</button>
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
          {rows.map((member) => {
            const position = member.showPositions ? latestPosition(positions.get(member.id)) : null;
            const line = [member.showMajor ? member.major : '', member.showCohort && member.cohort ? String(member.cohort) : ''].filter(Boolean).join(' · ');
            return (
              <li key={member.id}>
                <Link href={`${prefix}/members/${member.slug}`} className="group flex flex-col items-center gap-2 text-center">
                  <Avatar name={member.fullName} photoKey={member.showPhoto ? member.photoKey : null} size={148} />
                  <span className="font-semibold text-ink group-hover:text-teal-text">{member.fullName}</span>
                  {line && <span className="text-sm leading-[22px]">{line}</span>}
                  {position && <span className="text-sm leading-[22px] font-semibold text-teal-text">{position.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
    </>
  );
}
