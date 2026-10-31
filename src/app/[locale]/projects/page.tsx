import { getLocale, getTranslations } from 'next-intl/server';
import { ContentCard, StatusBadge } from '@/components/display';
import { FilterBar, FilterTab, FilterTabs, SearchField } from '@/components/filter-bar';
import { Container, EmptyState, PageHero } from '@/components/ui';
import { listProjects } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const FILTERS = ['on_progress', 'done', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const t = await getTranslations('project');
  const s = await getTranslations('status');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const active = FILTERS.includes(status as Filter) ? (status as Filter) : undefined;
  const rows = await listProjects({ status: active, q: q?.slice(0, 80) });

  const tab = (value: Filter | undefined, label: string) => (
    <FilterTab key={label} href={{ pathname: `${prefix}/projects`, query: { ...(value ? { status: value } : {}), ...(q ? { q } : {}) } }} active={active === value}>{label}</FilterTab>
  );

  return (
    <>
    <PageHero title={t('title')} intro={t('intro')} />
    <Container className="py-12">
      <FilterBar>
        <FilterTabs>
          {tab(undefined, t('all'))}
          {FILTERS.map((f) => tab(f, s(f)))}
        </FilterTabs>
        <SearchField label={t('search')} value={q} hidden={{ status: active }} clearHref={{ pathname: `${prefix}/projects`, query: active ? { status: active } : {} }} />
      </FilterBar>
      {rows.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="reveal-items grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ project, coverKey, logoKey }) => (
            <ContentCard key={project.id} href={`${prefix}/projects/${project.slug}`} name={project.name} description={project.description} coverKey={coverKey} logoKey={logoKey} meta={<StatusBadge status={project.status} />} />
          ))}
        </div>
      )}
    </Container>
    </>
  );
}
