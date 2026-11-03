import { asc, desc, eq, ne } from 'drizzle-orm';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { decideTimelineRequest } from '@/actions/members';
import { decideProposal } from '@/actions/proposals';
import { FilterTab, FilterTabs } from '@/components/filter-bar';
import { RequestDecision } from '@/components/request-decision';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities, involvementRequests, members, projectProposals, projectTimelineItems, projects, timelineRequests } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { formatDate } from '@/lib/util';

export const metadata = { title: 'Request' };

const TABS = ['proposals', 'join', 'timeline', 'history'] as const;
type Tab = (typeof TABS)[number];

const involvement = (filter: ReturnType<typeof eq>) =>
  db
    .select({
      request: involvementRequests,
      member: members.fullName,
      project: projects.name,
      projectStatus: projects.status,
      activity: activities.name,
    })
    .from(involvementRequests)
    .innerJoin(members, eq(members.id, involvementRequests.memberId))
    .leftJoin(projects, eq(projects.id, involvementRequests.projectId))
    .leftJoin(activities, eq(activities.id, involvementRequests.activityId))
    .where(filter);

const timeline = (filter: ReturnType<typeof eq>) =>
  db
    .select({ request: timelineRequests, item: projectTimelineItems, member: members.fullName, project: projects.name })
    .from(timelineRequests)
    .innerJoin(projectTimelineItems, eq(projectTimelineItems.id, timelineRequests.itemId))
    .innerJoin(projects, eq(projects.id, projectTimelineItems.projectId))
    .innerJoin(members, eq(members.id, timelineRequests.memberId))
    .where(filter);

const proposals = (filter: ReturnType<typeof eq>) =>
  db
    .select({ proposal: projectProposals, member: members.fullName })
    .from(projectProposals)
    .innerJoin(members, eq(members.id, projectProposals.memberId))
    .where(filter);

/** Kepala kartu yang sama untuk semua jenis request: jenis, pengusul, target, dan tanggal pengajuan. */
function RequestHead({ kind, member, target, date }: { kind: string; member: string; target: ReactNode; date: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label text-orange-text">{kind}</span>
        <span className="text-sm leading-[22px]">{date}</span>
      </div>
      <p className="text-lg leading-7"><strong className="text-heading">{member}</strong> → {target}</p>
    </div>
  );
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireCommittee();
  const { tab: rawTab } = await searchParams;
  const t = await getTranslations('committee');
  const me = await getTranslations('me');
  const tl = await getTranslations('timeline');
  const pr = await getTranslations('proposal');
  const locale = await getLocale();
  const day = (d: Date | string) => formatDate(typeof d === 'string' ? d : d.toISOString().slice(0, 10), locale);
  const range = (start: string | null, end: string | null) => (start && end ? `${day(start)} – ${day(end)}` : '');

  const [joinPending, timelinePending, proposalsPending] = await Promise.all([
    involvement(eq(involvementRequests.status, 'pending')).orderBy(asc(involvementRequests.createdAt)),
    timeline(eq(timelineRequests.status, 'pending')).orderBy(asc(timelineRequests.createdAt)),
    proposals(eq(projectProposals.status, 'pending')).orderBy(asc(projectProposals.createdAt)),
  ]);
  const counts: Record<Tab, number | undefined> = {
    proposals: proposalsPending.length,
    join: joinPending.length,
    timeline: timelinePending.length,
    history: undefined,
  };
  // Tanpa pilihan, buka tab pertama yang punya request menunggu.
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : (TABS.find((k) => counts[k]) ?? 'proposals');

  const history =
    tab === 'history'
      ? await Promise.all([
          involvement(ne(involvementRequests.status, 'pending')).orderBy(desc(involvementRequests.decidedAt)).limit(30),
          timeline(ne(timelineRequests.status, 'pending')).orderBy(desc(timelineRequests.decidedAt)).limit(30),
          proposals(ne(projectProposals.status, 'pending')).orderBy(desc(projectProposals.decidedAt)).limit(30),
        ]).then(([join, changes, props]) =>
          [
            ...join.map(({ request, member, project, activity }) => ({
              id: request.id,
              kind: t(project ? 'kindJoinProject' : 'kindJoinActivity'),
              text: `${member} → ${project ?? activity}`,
              status: request.status,
              note: request.decisionNote,
              decidedAt: request.decidedAt,
            })),
            ...changes.map(({ request, item, member, project }) => ({
              id: request.id,
              kind: tl(request.kind === 'status' ? 'kindStatus' : 'kindDates'),
              text: `${member} → ${project}: ${item.title}`,
              status: request.status,
              note: request.decisionNote,
              decidedAt: request.decidedAt,
            })),
            ...props.map(({ proposal, member }) => ({
              id: proposal.id,
              kind: pr('label'),
              text: `${member} → ${proposal.name}`,
              status: proposal.status,
              note: proposal.decisionNote,
              decidedAt: proposal.decidedAt,
            })),
          ]
            .sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0))
            .slice(0, 50),
        )
      : [];

  const empty = <EmptyState message={t('noPendingTab')} />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title={t('requests')} />
      <FilterTabs>
        {TABS.map((key) => (
          <FilterTab key={key} href={{ pathname: '/committee/requests', query: { tab: key } }} active={tab === key} count={counts[key]}>
            {t(`tab_${key}`)}
          </FilterTab>
        ))}
      </FilterTabs>
      <p className="text-sm leading-[22px]">{t(`tabIntro_${tab}`)}</p>

      {tab === 'proposals' &&
        (proposalsPending.length === 0
          ? empty
          : proposalsPending.map(({ proposal, member }) => (
              <Card key={proposal.id} className="flex flex-col gap-3 bg-surface">
                <RequestHead kind={pr('label')} member={member} target={<strong className="text-heading">{proposal.name}</strong>} date={day(proposal.createdAt)} />
                <p className="prose-text">{proposal.description}</p>
                <div>
                  <p className="font-semibold text-heading">{tl('title')}</p>
                  <ol className="mt-1 flex flex-col border-t border-line">
                    {proposal.timeline.map((s, i) => (
                      <li key={i} className="border-b border-line py-2">
                        <p className="font-semibold text-heading">{s.title}</p>
                        <p className="text-sm leading-[22px]">{range(s.startDate, s.endDate)}</p>
                        {s.description && <p className="prose-text text-sm">{s.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="text-sm leading-[22px]">{pr('approveNote')}</p>
                <div data-testid={`proposal-${proposal.id}`}>
                  <RequestDecision requestId={proposal.id} decide={decideProposal} requireReasonOnReject />
                </div>
              </Card>
            )))}

      {tab === 'join' &&
        (joinPending.length === 0
          ? empty
          : joinPending.map(({ request, member, project, projectStatus, activity }) => (
              <Card key={request.id} className="flex flex-col gap-3 bg-surface">
                <RequestHead
                  kind={t(project ? 'kindJoinProject' : 'kindJoinActivity')}
                  member={member}
                  target={
                    request.projectId ? (
                      <Link href={`/committee/projects/${request.projectId}`} className="font-semibold text-teal-text">{project}</Link>
                    ) : (
                      <Link href={`/committee/activities/${request.activityId}`} className="font-semibold text-teal-text">{activity}</Link>
                    )
                  }
                  date={day(request.createdAt)}
                />
                {projectStatus && projectStatus !== 'open' && <p className="text-sm leading-[22px]">{t('joinNotOpen')}</p>}
                {request.note && <p className="prose-text">{request.note}</p>}
                <RequestDecision requestId={request.id} />
              </Card>
            )))}

      {tab === 'timeline' &&
        (timelinePending.length === 0
          ? empty
          : timelinePending.map(({ request, item, member, project }) => (
              <Card key={request.id} className="flex flex-col gap-3 bg-surface">
                <RequestHead
                  kind={tl(request.kind === 'status' ? 'kindStatus' : 'kindDates')}
                  member={member}
                  target={<><Link href={`/committee/projects/${item.projectId}`} className="font-semibold text-teal-text">{project}</Link>: {item.title}</>}
                  date={day(request.createdAt)}
                />
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm leading-[22px]">
                  <dt className="font-semibold">{tl('current')}</dt>
                  <dd>{request.kind === 'status' ? tl(item.status) : range(item.startDate, item.endDate)}</dd>
                  <dt className="font-semibold">{tl('proposed')}</dt>
                  <dd className="font-semibold text-heading">{request.kind === 'status' ? tl(request.proposedStatus!) : range(request.proposedStart, request.proposedEnd)}</dd>
                  {request.evidenceUrl && (
                    <>
                      <dt className="font-semibold">{tl('evidence')}</dt>
                      <dd><a href={request.evidenceUrl} target="_blank" rel="noreferrer" className="break-all font-semibold text-teal-text">{request.evidenceUrl}</a></dd>
                    </>
                  )}
                </dl>
                {request.note && <p className="prose-text">{request.note}</p>}
                <div data-testid={`timeline-request-${request.id}`}>
                  <RequestDecision requestId={request.id} decide={decideTimelineRequest} />
                </div>
              </Card>
            )))}

      {tab === 'history' &&
        (history.length === 0 ? (
          <EmptyState message={t('noHistory')} />
        ) : (
          <ul className="flex flex-col">
            {history.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 border-b border-line py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label text-orange-text">{row.kind}</span>
                  <span className="text-sm leading-[22px]">{row.decidedAt ? day(row.decidedAt) : ''}</span>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{row.text}</span>
                  <span className={`font-semibold ${row.status === 'rejected' ? 'text-danger' : 'text-teal-text'}`}>{me(row.status)}</span>
                </div>
                {row.note && <p className="prose-text text-sm">“{row.note}”</p>}
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
