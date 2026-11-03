import { asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { deleteActivity, setActivityPublished, updateActivity } from '@/actions/content';
import { Cover } from '@/components/display';
import { ActionButton, ActionForm, CheckList, ConfirmDelete, ImageUpload } from '@/components/forms';
import { MediaManager } from '@/components/media-manager';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities, activityMembers, members } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { mediaKey, ownerMedia } from '@/lib/queries';

export default async function EditActivity({ params }: { params: Promise<{ id: string }> }) {
  await requireCommittee();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [activity] = await db.select().from(activities).where(eq(activities.id, id));
  if (!activity) notFound();

  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const e = await getTranslations('editor');
  const info = await getTranslations('information');
  const [media, allMembers, team, logoKey] = await Promise.all([
    ownerMedia({ activity: id }),
    db.select({ id: members.id, label: members.fullName }).from(members).orderBy(asc(members.fullName)),
    db.select({ id: activityMembers.memberId }).from(activityMembers).where(eq(activityMembers.activityId, id)),
    mediaKey(activity.logoMediaId),
  ]);
  const hasPhoto = media.some((m) => m.kind === 'image');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={activity.name} action={<ConfirmDelete name={activity.name} action={deleteActivity.bind(null, id)} />} />
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-surface">
        <div>
          <p className="font-semibold text-heading">{activity.isPublished ? c('published') : c('draft')}</p>
          {!activity.isPublished && !hasPhoto && <p className="text-sm leading-[22px]">{t('placeholderWarn')}</p>}
        </div>
        <ActionButton action={setActivityPublished.bind(null, id, !activity.isPublished)} label={activity.isPublished ? t('unpublish') : t('publish')} variant={activity.isPublished ? 'secondary' : 'accent'} />
      </Card>
      <Card className="bg-surface">
        <h2 className="pb-2 font-semibold text-heading">{c('logo')}</h2>
        <div className="flex items-center gap-4">
          <Cover storageKey={logoKey} alt="" sizes="80px" className="size-20 rounded-sm" />
          <ImageUpload purpose="logo" ownerType="activity" ownerId={id} label={c('change')} />
        </div>
      </Card>
      <Card className="bg-surface">
        <ActionForm action={updateActivity.bind(null, id)} submitLabel={c('save')}>
          <Field label={c('name')} htmlFor="name"><input id="name" name="name" required maxLength={120} defaultValue={activity.name} className="input" /></Field>
          <Field label={t('activityDate')} htmlFor="activityDate"><input id="activityDate" name="activityDate" type="date" required defaultValue={activity.activityDate} className="input" /></Field>
          <Field label={c('description')} htmlFor="description"><textarea id="description" name="description" rows={7} maxLength={10000} defaultValue={activity.description} className="input" /></Field>
          <label className="flex min-h-11 items-center gap-2 font-semibold text-heading">
            <input type="checkbox" name="registrationOpen" defaultChecked={activity.registrationOpen} className="size-5" />
            {info('registrationOpen')}
          </label>
          <Field label={info('registrationUrl')} htmlFor="registrationUrl"><input id="registrationUrl" name="registrationUrl" type="url" maxLength={500} defaultValue={activity.registrationUrl ?? ''} className="input" /></Field>
          <CheckList name="memberIds" label={t('participants')} options={allMembers} selected={new Set(team.map((m) => m.id))} />
        </ActionForm>
      </Card>
      <Card className="bg-surface">
        <h2 className="pb-3 text-[22px] leading-[30px] font-semibold">{e('media')}</h2>
        <MediaManager owner={{ type: 'activity', id }} items={media} />
      </Card>
    </div>
  );
}
