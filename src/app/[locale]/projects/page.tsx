import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ContentCard, StatusBadge } from '@/components/display';
import { Container, EmptyState, PageHeader } from '@/components/ui';
import { listProjects } from '@/lib/queries';

export const dynamic = 'force-dynamic';

const FILTERS = ['on_progress', 'done', 'cancelled'] as const;
type Filter = (typeof FILTERS)[number];

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const t = await getTranslations('project');
  const s = await getTranslations('status');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const active = FILTERS.includes(status as Filter) ? (status as Filter) : undefined;
  const rows = await listProjects({ status: active, q: q?.slice(0, 80) });

  const tab = (value: Filter | undefined, label: string) => (
    <Link
      key={label}
      href={{ pathname: `${prefix}/projects`, query: { ...(value ? { status: value } : {}), ...(q ? { q } : {}) } }}
      aria-current={active === value ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center rounded-sm border px-3 font-semibold ${active === value ? 'border-teal-text bg-teal-text text-white' : 'border-line hover:border-teal-text'}`}
    >
      {label}
    </Link>
  );

  return (
    <Container className="py-12">
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6">
        <div className="flex flex-wrap gap-2">
          {tab(undefined, t('all'))}
          {FILTERS.map((f) => tab(f, s(f)))}
        </div>
        <form role="search" className="flex gap-2">
          {active && <input type="hidden" name="status" value={active} />}
          <input name="q" defaultValue={q} aria-label={t('search')} placeholder={t('search')} className="input max-w-56" />
          <button className="sr-only">{c('search')}</button>
        </form>
      </div>
      {rows.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(({ project, coverKey, logoKey }) => (
            <ContentCard key={project.id} href={`${prefix}/projects/${project.slug}`} name={project.name} description={project.description} coverKey={coverKey} logoKey={logoKey} meta={<StatusBadge status={project.status} />} />
          ))}
        </div>
      )}
    </Container>
  );
}
