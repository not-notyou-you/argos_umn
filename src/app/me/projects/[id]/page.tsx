import { and, desc, eq } from 'drizzle-orm';
import { Lock } from 'lucide-react';
import { forbidden, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { updateProjectContent } from '@/actions/content';
import { Cover, StatusBadge } from '@/components/display';
import { ActionForm, ImageUpload } from '@/components/forms';
import { MediaManager } from '@/components/media-manager';
import { ProjectFields } from '@/components/project-fields';
import { TimelineView } from '@/components/timeline';
import { TimelineRequestForm } from '@/components/timeline-request';
import { Card, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { projectTimelineItems, projects, timelineRequests } from '@/db/schema';
import { todayInJakarta } from '@/lib/access';
import { isProjectMember, requireMember } from '@/lib/auth';
import { mediaKey, ownerMedia, participants, projectTimeline } from '@/lib/queries';

export default async function EditMyProject({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();
  if (!(await isProjectMember(user, id))) forbidden();

  const t = await getTranslations('me');
  const c = await getTranslations('common');
  const e = await getTranslations('editor');
  const tl = await getTranslations('timeline');
  const [media, team, logoKey, timeline] = await Promise.all([
    ownerMedia({ project: id }),
    participants('project', id),
    mediaKey(project.logoMediaId),
    projectTimeline(id, { withDescription: true }),
  ]);
  const myRequests = await db
    .select({ request: timelineRequests, item: projectTimelineItems.title })
    .from(timelineRequests)
    .innerJoin(projectTimelineItems, eq(projectTimelineItems.id, timelineRequests.itemId))
    .where(and(eq(projectTimelineItems.projectId, id), eq(timelineRequests.memberId, user.memberId)))
    .orderBy(desc(timelineRequests.createdAt))
    .limit(20);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={project.name} />
      <Card className="flex flex-col gap-3 bg-surface">
        <p className="flex flex-wrap items-center gap-2"><strong className="text-heading">{c('status')}:</strong> <StatusBadge status={project.status} /> <span className="flex items-center gap-1 text-sm"><Lock size={14} aria-hidden /> {t('lockedStatus')}</span></p>
        <p className="flex flex-wrap items-center gap-2"><strong className="text-heading">{t('members')}:</strong> {team.map((m) => m.fullName).join(', ')} <span className="flex items-center gap-1 text-sm"><Lock size={14} aria-hidden /> {t('lockedMembers')}</span></p>
      </Card>
      <Card className="flex flex-col gap-3 bg-surface">
        <h2 className="text-[22px] leading-[30px] font-semibold">{tl('title')}</h2>
        <TimelineView items={timeline} today={todayInJakarta()} showDescription />
        <div className="border-t border-line pt-4">
          <h3 className="font-semibold text-heading">{tl('requestTitle')}</h3>
          <p className="pb-3 text-sm leading-[22px]">{tl('requestIntro')}</p>
          {project.status === 'on_progress' && timeline.length > 0 ? <TimelineRequestForm items={timeline} /> : <p>{tl('onlyOnProgress')}</p>}
          {myRequests.length > 0 && (
            <ul className="mt-4 flex flex-col">
              {myRequests.map(({ request, item }) => (
                <li key={request.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
                  <span className="text-heading">{item} ({tl(request.kind === 'status' ? 'kindStatus' : 'kindDates')})</span>
                  <span>{t(request.status)}{request.decisionNote ? `: "${request.decisionNote}"` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Card className="bg-surface">
        <h2 className="pb-2 font-semibold text-heading">{c('logo')}</h2>
        <div className="flex items-center gap-4">
          <Cover storageKey={logoKey} alt="" sizes="80px" className="size-20 rounded-sm" />
          <ImageUpload purpose="logo" ownerType="project" ownerId={id} label={c('change')} />
        </div>
      </Card>
      <Card className="bg-surface">
        <ActionForm action={updateProjectContent.bind(null, id)} submitLabel={c('save')}>
          <ProjectFields project={project} />
        </ActionForm>
      </Card>
      <Card className="bg-surface">
        <h2 className="pb-3 text-[22px] leading-[30px] font-semibold">{e('media')}</h2>
        <MediaManager owner={{ type: 'project', id }} items={media} />
      </Card>
    </div>
  );
}
