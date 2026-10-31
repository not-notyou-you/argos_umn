import { asc, desc, eq, ne } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { RequestDecision } from '@/components/request-decision';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities, involvementRequests, members, projects } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'Request' };

const rows = (filter: ReturnType<typeof eq>) =>
  db
    .select({ request: involvementRequests, member: members.fullName, project: projects.name, activity: activities.name })
    .from(involvementRequests)
    .innerJoin(members, eq(members.id, involvementRequests.memberId))
    .leftJoin(projects, eq(projects.id, involvementRequests.projectId))
    .leftJoin(activities, eq(activities.id, involvementRequests.activityId))
    .where(filter);

export default async function RequestsPage() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const me = await getTranslations('me');
  const [pending, decided] = await Promise.all([
    rows(eq(involvementRequests.status, 'pending')).orderBy(asc(involvementRequests.createdAt)),
    rows(ne(involvementRequests.status, 'pending')).orderBy(desc(involvementRequests.decidedAt)).limit(20),
  ]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title={t('requests')} />
      {pending.length === 0 && <EmptyState message={t('noRequests')} />}
      {pending.map(({ request, member, project, activity }) => (
        <Card key={request.id} className="flex flex-col gap-2 bg-surface">
          <p><strong className="text-heading">{member}</strong> → {project ?? activity}</p>
          {request.note && <p className="prose-text">{request.note}</p>}
          <RequestDecision requestId={request.id} />
        </Card>
      ))}
      {decided.length > 0 && (
        <>
          <h2 className="pt-4 text-[22px] leading-[30px] font-semibold">{t('decided')}</h2>
          <ul className="flex flex-col">
            {decided.map(({ request, member, project, activity }) => (
              <li key={request.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
                <span>{member} → {project ?? activity}</span>
                <span>{me(request.status)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
