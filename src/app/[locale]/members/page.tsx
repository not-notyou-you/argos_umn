import { getLocale, getTranslations } from 'next-intl/server';
import { MemberCard } from '@/components/display';
import { FilterBar, FilterTab, FilterTabs, SearchField } from '@/components/filter-bar';
import { FilterSelect } from '@/components/filter-select';
import { Container, EmptyState, PageHero } from '@/components/ui';
import { latestPosition, listMembers, memberCounts, positionsFor, publicCohorts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; cohort?: string }> }) {
  const { tab, q, cohort } = await searchParams;
  const t = await getTranslations('member');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const status = tab === 'offboarded' ? 'offboarded' : 'onboarded';
  const cohortNumber = Number(cohort) || undefined;

  const [rows, counts, cohorts] = await Promise.all([listMembers(status, q?.slice(0, 80), cohortNumber), memberCounts(), publicCohorts()]);
  const positions = await positionsFor(rows.map((r) => r.id));

  return (
    <>
    <PageHero title={t('title')} intro={t('intro')} />
    <Container className="py-12">
      <FilterBar>
        <FilterTabs>
          {(['onboarded', 'offboarded'] as const).map((value) => (
            <FilterTab key={value} href={{ pathname: `${prefix}/members`, query: value === 'offboarded' ? { tab: value } : {} }} active={status === value} count={counts[value]}>
              {t(value)}
            </FilterTab>
          ))}
        </FilterTabs>
        <SearchField label={t('search')} value={q} hidden={{ tab: status === 'offboarded' ? status : undefined }} clearHref={{ pathname: `${prefix}/members`, query: { ...(status === 'offboarded' ? { tab: status } : {}), ...(cohort ? { cohort } : {}) } }}>
          <FilterSelect name="cohort" label={t('cohort')} defaultValue={cohort} options={[{ value: '', label: t('allCohorts') }, ...cohorts.map((year) => ({ value: String(year), label: String(year) }))]} />
        </SearchField>
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <ul className="reveal-items grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {rows.map((member, i) => {
            const position = member.showPositions ? latestPosition(positions.get(member.id)) : null;
            const line = [member.showMajor ? member.major : '', member.showCohort && member.cohort ? String(member.cohort) : ''].filter(Boolean).join(' · ');
            return (
              <li key={member.id}>
                <MemberCard href={`${prefix}/members/${member.slug}`} index={i + 1} name={member.fullName} photoKey={member.showPhoto ? member.photoKey : null} position={position?.name} line={line} />
              </li>
            );
          })}
        </ul>
      )}
    </Container>
    </>
  );
}
