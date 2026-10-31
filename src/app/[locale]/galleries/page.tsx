import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { GalleryGrid } from '@/components/media-view';
import { Container, EmptyState, PageHero, buttonClass } from '@/components/ui';
import { galleryItems } from '@/lib/queries';

export const dynamic = 'force-dynamic';
const PAGE = 24;

export default async function GalleriesPage({ searchParams }: { searchParams: Promise<{ filter?: string; limit?: string }> }) {
  const params = await searchParams;
  const t = await getTranslations('gallery');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const filter = params.filter === 'project' || params.filter === 'activity' ? params.filter : 'all';
  const limit = Math.min(Math.max(Number(params.limit) || PAGE, PAGE), 500);
  const { items, hasMore } = await galleryItems(filter, limit);

  const view = items.map(({ media, projectName, projectSlug, activityName, activitySlug }) => ({
    ...media,
    caption: projectName ?? activityName ?? undefined,
    href: projectSlug ? `${prefix}/projects/${projectSlug}` : `${prefix}/activities/${activitySlug}`,
  }));

  const tabs = [
    { value: 'all', label: t('all') },
    { value: 'project', label: t('projects') },
    { value: 'activity', label: t('activities') },
  ];

  return (
    <>
    <PageHero title={t('title')} intro={t('intro')} meta={t('count', { n: items.length })} />
    <Container className="py-12">
      <div className="flex gap-2 pb-6">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={{ pathname: `${prefix}/galleries`, query: tab.value === 'all' ? {} : { filter: tab.value } }}
            aria-current={filter === tab.value ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-sm border px-3 font-semibold ${filter === tab.value ? 'border-teal-text bg-teal-text text-white' : 'border-line hover:border-teal-text'}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {view.length === 0 ? <EmptyState message={t('empty')} /> : <GalleryGrid items={view} />}
      {hasMore && (
        <div className="pt-8 text-center">
          <Link scroll={false} href={{ pathname: `${prefix}/galleries`, query: { ...(filter === 'all' ? {} : { filter }), limit: limit + PAGE } }} className={buttonClass('secondary')}>{t('more')}</Link>
        </div>
      )}
    </Container>
    </>
  );
}
