import { and, eq } from 'drizzle-orm';
import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { DetailPage } from '@/components/detail';
import { StatusBadge, projectPlaceholder } from '@/components/display';
import { TimelineView } from '@/components/timeline';
import { buttonClass } from '@/components/ui';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { todayInJakarta } from '@/lib/access';
import { listProjects, mediaKey, ownerMedia, participants, projectTimeline } from '@/lib/queries';
import { excerpt } from '@/lib/util';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

const getProject = async (slug: string) =>
  (await db.select().from(projects).where(and(eq(projects.slug, slug), eq(projects.isPublished, true))))[0];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getProject((await params).slug);
  return project ? { title: project.name, description: excerpt(project.description, 160) } : {};
}

export default async function ProjectDetail({ params }: Props) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const t = await getTranslations('project');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const tl = await getTranslations('timeline');
  const [media, team, logoKey, all, timeline] = await Promise.all([
    ownerMedia({ project: project.id }),
    participants('project', project.id),
    mediaKey(project.logoMediaId),
    listProjects(),
    projectTimeline(project.id),
  ]);
  const position = all.findIndex((row) => row.project.id === project.id);
  const following = all.length > 1 ? all[(position + 1) % all.length].project : null;

  const buttons = [
    { label: t('open'), url: project.projectUrl, visible: project.projectUrlVisible, variant: 'accent' as const },
    { label: t('github'), url: project.githubUrl, visible: project.githubUrlVisible, variant: 'secondary' as const },
    { label: t('docs'), url: project.docsUrl, visible: project.docsUrlVisible, variant: 'secondary' as const },
  ].filter((b) => b.visible && b.url);

  return (
    <DetailPage
      backHref={`${prefix}/projects`}
      backLabel={t('back')}
      name={project.name}
      logoKey={logoKey}
      badge={<StatusBadge status={project.status} />}
      media={media}
      aboutLabel={t('about')}
      mediaLabel={t('gallery')}
      next={following ? { href: `${prefix}/projects/${following.slug}`, name: following.name, label: t('next') } : undefined}
      description={project.description}
      teamLabel={t('team')}
      team={team}
      memberPrefix={prefix}
      placeholderSrc={projectPlaceholder(project.name)}
      extra={
        project.status !== 'open' && timeline.length > 0 ? (
          <div className="mt-12">
            <h2 className="label pb-2 text-orange-text">{tl('title')}</h2>
            <TimelineView items={timeline} today={todayInJakarta()} />
          </div>
        ) : undefined
      }
      actions={
        buttons.length > 0 ? (
          <div className="flex flex-col gap-2">
            {buttons.map((b) => (
              <a key={b.label} href={b.url!} target="_blank" rel="noreferrer" className={buttonClass(b.variant)}>
                {b.label} <ExternalLink size={16} aria-hidden />
              </a>
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
