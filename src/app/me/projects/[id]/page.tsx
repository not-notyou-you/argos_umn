import { eq } from 'drizzle-orm';
import { Lock } from 'lucide-react';
import { forbidden, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { updateProjectContent } from '@/actions/content';
import { Cover, StatusBadge } from '@/components/display';
import { ActionForm, ImageUpload } from '@/components/forms';
import { MediaManager } from '@/components/media-manager';
import { ProjectFields } from '@/components/project-fields';
import { Card, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { isProjectMember, requireMember } from '@/lib/auth';
import { mediaKey, ownerMedia, participants } from '@/lib/queries';

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
  const [media, team, logoKey] = await Promise.all([ownerMedia({ project: id }), participants('project', id), mediaKey(project.logoMediaId)]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={project.name} />
      <Card className="flex flex-col gap-3 bg-surface">
        <p className="flex flex-wrap items-center gap-2"><strong className="text-heading">{c('status')}:</strong> <StatusBadge status={project.status} /> <span className="flex items-center gap-1 text-sm"><Lock size={14} aria-hidden /> {t('lockedStatus')}</span></p>
        <p className="flex flex-wrap items-center gap-2"><strong className="text-heading">{t('members')}:</strong> {team.map((m) => m.fullName).join(', ')} <span className="flex items-center gap-1 text-sm"><Lock size={14} aria-hidden /> {t('lockedMembers')}</span></p>
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
