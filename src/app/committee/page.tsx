import { count, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuditTable } from '@/components/audit-table';
import { PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities, involvementRequests, projects } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'Committee' };

export default async function CommitteeDashboard() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const [[requests], [draftProjects], [draftActivities]] = await Promise.all([
    db.select({ n: count() }).from(involvementRequests).where(eq(involvementRequests.status, 'pending')),
    db.select({ n: count() }).from(projects).where(eq(projects.isPublished, false)),
    db.select({ n: count() }).from(activities).where(eq(activities.isPublished, false)),
  ]);
  const tiles = [
    { href: '/committee/requests', label: t('pendingRequests'), value: requests.n },
    { href: '/committee/projects', label: t('draftProjects'), value: draftProjects.n },
    { href: '/committee/activities', label: t('draftActivities'), value: draftActivities.n },
  ];
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('dashboard')} />
      <ul className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.href}>
            <Link href={tile.href} className="block rounded-md border border-line bg-surface p-4 hover:border-teal-text">
              <span className="block text-[30px] leading-[38px] font-bold text-heading">{tile.value}</span>
              {tile.label}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="pt-8 pb-3 text-[22px] leading-[30px] font-semibold">{t('recent')}</h2>
      <AuditTable limit={8} />
    </div>
  );
}
