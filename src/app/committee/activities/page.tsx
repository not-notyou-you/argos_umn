import { desc } from 'drizzle-orm';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { createActivity } from '@/actions/content';
import { ActionForm } from '@/components/forms';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { formatDate } from '@/lib/util';

export const metadata = { title: 'Activity' };

export default async function CommitteeActivities() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const locale = await getLocale();
  const rows = await db.select().from(activities).orderBy(desc(activities.activityDate));
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('activities')} />
      <Card className="bg-white">
        <ActionForm action={createActivity} submitLabel={t('createDraft')} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1"><Field label={t('newActivity')} htmlFor="name"><input id="name" name="name" required maxLength={120} className="input" /></Field></div>
          <div><Field label={t('activityDate')} htmlFor="activityDate"><input id="activityDate" name="activityDate" type="date" required className="input" /></Field></div>
        </ActionForm>
      </Card>
      <ul className="flex flex-col gap-2">
        {rows.map((activity) => (
          <li key={activity.id}>
            <Link href={`/committee/activities/${activity.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white p-3 hover:border-teal-text">
              <span className="font-semibold text-ink">{activity.name}</span>
              <span className="text-sm">{formatDate(activity.activityDate, locale)} · {activity.isPublished ? c('published') : c('draft')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
