import { getLocale, getTranslations } from 'next-intl/server';
import { FilterBar, FilterTab, FilterTabs, SearchField } from '@/components/filter-bar';
import { ProjectFrame } from '@/components/project-frame';
import { Container, EmptyState, PageHero } from '@/components/ui';
import { listProjects } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const FILTERS = ['open', 'on_progress', 'done', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const t = await getTranslations('project');
  const s = await getTranslations('status');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const active = FILTERS.includes(status as Filter) ? (status as Filter) : undefined;
  // Ambil semua hasil pencarian sekali, lalu saring per status di sini agar tiap tab bisa menampilkan jumlahnya.
  const all = await listProjects({ q: q?.slice(0, 80) });
  const rows = active ? all.filter((r) => r.project.status === active) : all;
  const count = (value: Filter | undefined) => (value ? all.filter((r) => r.project.status === value).length : all.length);

  const tab = (value: Filter | undefined, label: string) => (
    <FilterTab key={label} href={{ pathname: `${prefix}/projects`, query: { ...(value ? { status: value } : {}), ...(q ? { q } : {}) } }} active={active === value} count={count(value)}>{label}</FilterTab>
  );

  return (
    <>
    <PageHero title={t('title')} />
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
        <div className="reveal-items grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ project, coverKey }) => (
            <ProjectFrame
              key={project.id}
              href={`${prefix}/projects/${project.slug}`}
              name={project.name}
              description={project.description}
              coverKey={coverKey}
              status={project.status}
              sizes="(min-width: 1280px) 384px, (min-width: 768px) 50vw, 100vw"
            />
          ))}
        </div>
      )}
    </Container>
    </>
  );
}
