import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { ExternalLink } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { sendInvolvementRequest } from '@/actions/members';
import { Cover } from '@/components/display';
import { ActionForm } from '@/components/forms';
import { TimelineView } from '@/components/timeline';
import { Card, EmptyState, Field, PageHeader, buttonClass } from '@/components/ui';
import { db } from '@/db';
import { activities, involvementRequests, projectMembers } from '@/db/schema';
import { todayInJakarta } from '@/lib/access';
import { requireMember } from '@/lib/auth';
import { listProjects, projectTimeline } from '@/lib/queries';
import { excerpt, formatDate } from '@/lib/util';

export const metadata = { title: 'Information' };

export default async function InformationPage() {
  const user = await requireMember();
  const t = await getTranslations('information');
  const tl = await getTranslations('timeline');
  const me = await getTranslations('me');
  const locale = await getLocale();
  const today = todayInJakarta();

  const [openProjects, openActivities, mine, myRequests] = await Promise.all([
    listProjects({ status: 'open' }),
    db
      .select()
      .from(activities)
      .where(and(eq(activities.isPublished, true), eq(activities.registrationOpen, true), isNotNull(activities.registrationUrl)))
      .orderBy(desc(activities.activityDate)),
    db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.memberId, user.memberId)),
    db
      .select({ projectId: involvementRequests.projectId, status: involvementRequests.status })
      .from(involvementRequests)
      .where(and(eq(involvementRequests.memberId, user.memberId), isNotNull(involvementRequests.projectId)))
      .orderBy(desc(involvementRequests.createdAt)),
  ]);
  const joined = new Set(mine.map((m) => m.projectId));
  // Request terbaru per project menentukan apa yang ditampilkan.
  const latest = new Map<string, string>();
  for (const r of myRequests) if (r.projectId && !latest.has(r.projectId)) latest.set(r.projectId, r.status);
  const timelines = await Promise.all(openProjects.map(({ project }) => projectTimeline(project.id, { withDescription: true })));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader title={t('title')} intro={t('intro')} />

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] leading-[30px] font-semibold">{t('projects')}</h2>
        {openProjects.length === 0 && <EmptyState message={t('noProjects')} />}
        {openProjects.map(({ project, coverKey }, i) => {
          const request = latest.get(project.id);
          return (
            <Card key={project.id} className="flex flex-col gap-4 bg-surface">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Cover storageKey={coverKey} kind="project" title={project.name} alt="" sizes="240px" className="aspect-[16/10] w-full shrink-0 rounded-sm sm:w-60" />
                <div className="flex min-w-0 flex-col gap-2">
                  <h3 className="text-xl leading-7 font-semibold">{project.name}</h3>
                  {project.description && <p className="prose-text">{excerpt(project.description, 280)}</p>}
                </div>
              </div>
              <div>
                <h4 className="pb-1 font-semibold text-heading">{tl('title')}</h4>
                <TimelineView items={timelines[i]} today={today} showDescription />
              </div>
              {joined.has(project.id) ? (
                <p className="font-semibold text-teal-text">{t('joined')}</p>
              ) : request === 'pending' ? (
                <p className="font-semibold">{me('pending')}</p>
              ) : (
                <>
                  {request === 'rejected' && <p className="text-sm leading-[22px]">{me('rejected')}</p>}
                  <div data-testid={`register-${project.id}`}>
                    <ActionForm action={sendInvolvementRequest} submitLabel={t('register')}>
                      <input type="hidden" name="target" value={`project:${project.id}`} />
                      <Field label={t('registerNote')} htmlFor={`note-${project.id}`}>
                        <textarea id={`note-${project.id}`} name="note" rows={2} maxLength={500} className="input" />
                      </Field>
                    </ActionForm>
                  </div>
                </>
              )}
            </Card>
          );
        })}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[22px] leading-[30px] font-semibold">{t('activities')}</h2>
        {openActivities.length === 0 && <EmptyState message={t('noActivities')} />}
        {openActivities.map((activity) => (
          <Card key={activity.id} className="flex flex-col gap-2 bg-surface">
            <h3 className="text-xl leading-7 font-semibold">{activity.name}</h3>
            <p className="text-sm leading-[22px]">{formatDate(activity.activityDate, locale)}</p>
            {activity.description && <p className="prose-text">{excerpt(activity.description, 280)}</p>}
            <div>
              <a href={activity.registrationUrl!} target="_blank" rel="noreferrer" className={buttonClass('accent')}>
                {t('goRegister')} <ExternalLink size={16} aria-hidden />
              </a>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
