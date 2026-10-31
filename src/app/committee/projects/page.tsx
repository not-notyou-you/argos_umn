import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createProject } from '@/actions/content';
import { StatusBadge } from '@/components/display';
import { ActionForm } from '@/components/forms';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'Project' };

export default async function CommitteeProjects() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('projects')} />
      <Card className="bg-white">
        <ActionForm action={createProject} submitLabel={t('createDraft')} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1"><Field label={t('newProject')} htmlFor="name"><input id="name" name="name" required maxLength={120} className="input" /></Field></div>
        </ActionForm>
      </Card>
      <ul className="flex flex-col gap-2">
        {rows.map((project) => (
          <li key={project.id}>
            <Link href={`/committee/projects/${project.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white p-3 hover:border-teal-text">
              <span className="font-semibold text-ink">{project.name}</span>
              <span className="flex items-center gap-3"><StatusBadge status={project.status} /><span className="text-sm">{project.isPublished ? c('published') : c('draft')}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
