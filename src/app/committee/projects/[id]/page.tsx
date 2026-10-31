import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { deleteProject, setProjectPublished, updateProjectAdmin, updateProjectContent } from '@/actions/content';
import { Cover } from '@/components/display';
import { ActionButton, ActionForm, CheckList, ConfirmDelete, ImageUpload } from '@/components/forms';
import { MediaManager } from '@/components/media-manager';
import { ProjectFields } from '@/components/project-fields';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { members, projectMembers, projects } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { mediaKey, ownerMedia } from '@/lib/queries';

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
  const [media, allMembers, team, logoKey] = await Promise.all([
    ownerMedia({ project: id }),
    db.select({ id: members.id, label: members.fullName }).from(members).orderBy(asc(members.fullName)),
    db.select({ id: projectMembers.memberId }).from(projectMembers).where(eq(projectMembers.projectId, id)),
    mediaKey(project.logoMediaId),
  ]);
  const hasPhoto = media.some((m) => m.kind === 'image');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={project.name} action={<ConfirmDelete name={project.name} action={deleteProject.bind(null, id)} />} />
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-white">
        <div>
          <p className="font-semibold text-ink">{project.isPublished ? c('published') : c('draft')}</p>
          {!project.isPublished && !hasPhoto && <p className="text-sm leading-[22px]">{t('placeholderWarn')}</p>}
        </div>
        <ActionButton action={setProjectPublished.bind(null, id, !project.isPublished)} label={project.isPublished ? t('unpublish') : t('publish')} variant={project.isPublished ? 'secondary' : 'accent'} />
      </Card>
      <Card className="bg-white">
        <ActionForm action={updateProjectAdmin.bind(null, id)} submitLabel={c('save')}>
          <Field label={c('status')} htmlFor="status">
            <select id="status" name="status" defaultValue={project.status} className="input">
              {(['on_progress', 'done', 'cancelled'] as const).map((value) => <option key={value} value={value}>{s(value)}</option>)}
            </select>
          </Field>
          <CheckList name="memberIds" label={t('participants')} options={allMembers} selected={new Set(team.map((m) => m.id))} />
        </ActionForm>
      </Card>
      <Card className="bg-white">
        <h2 className="pb-2 font-semibold text-ink">{c('logo')}</h2>
        <div className="flex items-center gap-4">
          <Cover storageKey={logoKey} alt="" sizes="80px" className="size-20 rounded-sm" />
          <ImageUpload purpose="logo" ownerType="project" ownerId={id} label={c('change')} />
        </div>
      </Card>
      <Card className="bg-white">
        <ActionForm action={updateProjectContent.bind(null, id)} submitLabel={c('save')}>
          <ProjectFields project={project} />
        </ActionForm>
      </Card>
      <Card className="bg-white">
        <h2 className="pb-3 text-[22px] leading-[30px] font-semibold">{e('media')}</h2>
        <MediaManager owner={{ type: 'project', id }} items={media} />
      </Card>
    </div>
  );
}
