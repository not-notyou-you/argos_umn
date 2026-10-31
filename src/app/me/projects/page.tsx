import { getTranslations } from 'next-intl/server';
import { Cover, StatusBadge } from '@/components/display';
import { ButtonLink, EmptyState, PageHeader } from '@/components/ui';
import { requireMember } from '@/lib/auth';
import { memberInvolvement } from '@/lib/queries';

export const metadata = { title: 'My Project' };

export default async function MyProjectsPage() {
  const user = await requireMember();
  const t = await getTranslations('me');
  const c = await getTranslations('common');
  const { projects } = await memberInvolvement(user.memberId, { publishedOnly: false });
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t('projects')} />
      {projects.length === 0 ? (
        <EmptyState message={t('noProjects')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id} className="overflow-hidden rounded-md border border-line bg-surface">
              <Cover storageKey={project.coverKey} alt="" sizes="400px" className="aspect-[16/10] w-full" />
              <div className="flex flex-col items-start gap-2 p-4">
                <h2 className="text-xl leading-7 font-semibold">{project.name}</h2>
                <StatusBadge status={project.status} />
                <ButtonLink href={`/me/projects/${project.id}`} variant="secondary">{c('edit')}</ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
