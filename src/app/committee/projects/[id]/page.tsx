import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { deleteProject, setProjectPublished, updateProjectAdmin, updateProjectContent } from '@/actions/content';
import { Cover } from '@/components/display';
import { ActionButton, ActionForm, CheckList, ConfirmDelete, ImageUpload } from '@/components/forms';
import { MediaManager } from '@/components/media-manager';
import { ProjectFields } from '@/components/project-fields';
import { RequestDecision } from '@/components/request-decision';
import { TimelineView } from '@/components/timeline';
import { TimelineEditor } from '@/components/timeline-editor';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { LOCKED_STATUSES, involvementRequests, members, projectMembers, projectStatus, projects } from '@/db/schema';
import { todayInJakarta } from '@/lib/access';
import { requireCommittee } from '@/lib/auth';
import { mediaKey, ownerMedia, projectTimeline } from '@/lib/queries';

export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  await requireCommittee();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) notFound();

  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const e = await getTranslations('editor');
  const s = await getTranslations('status');
  const tl = await getTranslations('timeline');
  const [media, allMembers, team, logoKey, timeline, applicants] = await Promise.all([
    ownerMedia({ project: id }),
    db.select({ id: members.id, label: members.fullName }).from(members).orderBy(asc(members.fullName)),
    db.select({ id: projectMembers.memberId }).from(projectMembers).where(eq(projectMembers.projectId, id)),
    mediaKey(project.logoMediaId),
    projectTimeline(id, { withDescription: true }),
    db
      .select({ request: involvementRequests, member: members.fullName })
      .from(involvementRequests)
      .innerJoin(members, eq(members.id, involvementRequests.memberId))
      .where(and(eq(involvementRequests.projectId, id), eq(involvementRequests.status, 'pending')))
      .orderBy(asc(involvementRequests.createdAt)),
  ]);
  const locked = LOCKED_STATUSES.includes(project.status);
  const teamIds = new Set(team.map((m) => m.id));
  const hasPhoto = media.some((m) => m.kind === 'image');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={project.name} action={<ConfirmDelete name={project.name} action={deleteProject.bind(null, id)} />} />
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-surface">
        <div>
          <p className="font-semibold text-heading">{project.isPublished ? c('published') : c('draft')}</p>
          {!project.isPublished && !hasPhoto && <p className="text-sm leading-[22px]">{t('placeholderWarn')}</p>}
        </div>
        <ActionButton action={setProjectPublished.bind(null, id, !project.isPublished)} label={project.isPublished ? t('unpublish') : t('publish')} variant={project.isPublished ? 'secondary' : 'accent'} />
      </Card>
      <Card className="bg-surface">
        <ActionForm action={updateProjectAdmin.bind(null, id)} submitLabel={c('save')}>
          <Field label={c('status')} htmlFor="status">
            <select id="status" name="status" defaultValue={project.status} className="input">
              {projectStatus.enumValues.map((value) => <option key={value} value={value}>{s(value)}</option>)}
            </select>
          </Field>
          {locked ? (
            <fieldset className="flex flex-col gap-1">
              <legend className="font-semibold text-heading">{t('participants')}</legend>
              {/* Dikirim ulang agar anggota tetap utuh saat status dibuka kembali. */}
              {[...teamIds].map((memberId) => <input key={memberId} type="hidden" name="memberIds" value={memberId} />)}
              <p>{allMembers.filter((m) => teamIds.has(m.id)).map((m) => m.label).join(', ') || c('noData')}</p>
              <p className="text-sm leading-[22px]">{tl('lockedNote')}</p>
            </fieldset>
          ) : (
            <CheckList name="memberIds" label={t('participants')} options={allMembers} selected={teamIds} />
          )}
        </ActionForm>
      </Card>
      <Card className="bg-surface">
        <h2 className="text-[22px] leading-[30px] font-semibold">{tl('title')}</h2>
        <p className="pb-3 text-sm leading-[22px]">{locked ? tl('lockedNote') : tl('intro')}</p>
        {locked ? <TimelineView items={timeline} today={todayInJakarta()} showDescription /> : <TimelineEditor projectId={id} items={timeline} />}
      </Card>
      {(project.status === 'open' || applicants.length > 0) && (
        <Card className="flex flex-col gap-3 bg-surface">
          <h2 className="text-[22px] leading-[30px] font-semibold">{tl('applicants')}</h2>
          {applicants.length === 0 && <p>{tl('noApplicants')}</p>}
          {applicants.map(({ request, member }) => (
            <div key={request.id} className="flex flex-col gap-2 border-b border-line pb-3 last:border-b-0">
              <p className="font-semibold text-heading">{member}</p>
              {request.note && <p className="prose-text">{request.note}</p>}
              <RequestDecision requestId={request.id} />
            </div>
          ))}
        </Card>
      )}
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
