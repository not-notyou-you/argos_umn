import { and, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { sendInvolvementRequest, updateMyProfile } from '@/actions/members';
import { Avatar } from '@/components/display';
import { ActionForm, ImageUpload } from '@/components/forms';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { activities, involvementRequests, media, members, projects } from '@/db/schema';
import { requireMember } from '@/lib/auth';
import { memberInvolvement } from '@/lib/queries';

export const metadata = { title: 'My Profile' };

export default async function MyProfilePage() {
  const user = await requireMember();
  const t = await getTranslations('me');
  const c = await getTranslations('common');
  const [row] = await db
    .select({ member: members, photoKey: media.storageKey })
    .from(members)
    .leftJoin(media, eq(media.id, members.photoMediaId))
    .where(eq(members.id, user.memberId));
  const { member, photoKey } = row;

  const [involvement, requests, allProjects, allActivities] = await Promise.all([
    memberInvolvement(member.id, { publishedOnly: false }),
    db
      .select({ request: involvementRequests, projectName: projects.name, activityName: activities.name })
      .from(involvementRequests)
      .leftJoin(projects, eq(projects.id, involvementRequests.projectId))
      .leftJoin(activities, eq(activities.id, involvementRequests.activityId))
      .where(eq(involvementRequests.memberId, member.id))
      .orderBy(desc(involvementRequests.createdAt)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.isPublished, true), eq(projects.status, 'open'))),
    db.select({ id: activities.id, name: activities.name }).from(activities).where(and(eq(activities.isPublished, true))),
  ]);

  const joined = new Set([...involvement.projects.map((p) => p.id), ...involvement.activities.map((a) => a.id)]);
  const flags = ['showPhoto', 'showMajor', 'showCohort', 'showPositions', 'showActivities', 'showProjects'] as const;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('profile')} action={<Link href={`/members/${member.slug}`} className="font-semibold text-teal-text">{t('viewPublic')} ↗</Link>} />

      <Card>
        <div className="flex items-center gap-4 pb-4">
          <Avatar name={member.fullName} photoKey={photoKey} size={96} />
          <ImageUpload purpose="avatar" ownerType="member" ownerId={member.id} label={c('change')} />
        </div>
        <ActionForm action={updateMyProfile} submitLabel={c('save')}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              <Field label={t('name')} htmlFor="fullName"><input id="fullName" name="fullName" required maxLength={120} defaultValue={member.fullName} className="input" /></Field>
              <Field label={t('major')} htmlFor="major"><input id="major" name="major" maxLength={120} defaultValue={member.major} className="input" /></Field>
              <Field label={t('cohort')} htmlFor="cohort"><input id="cohort" name="cohort" type="number" min={2000} max={2100} defaultValue={member.cohort ?? ''} className="input" /></Field>
            </div>
            <fieldset>
              <legend className="font-semibold text-heading">{t('visibility')}</legend>
              <p className="flex min-h-11 items-center justify-between">{t('name')} <span className="text-sm">{t('always')}</span></p>
              {flags.map((flag) => (
                <label key={flag} className="flex min-h-11 items-center justify-between gap-2">
                  {t(flag)}
                  <input type="checkbox" name={flag} defaultChecked={member[flag]} className="size-5" />
                </label>
              ))}
              <p className="mt-1 text-sm leading-[22px]">{t('visibilityNote')}</p>
            </fieldset>
          </div>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-[22px] leading-[30px] font-semibold">{t('involvement')}</h2>
        <p className="text-sm leading-[22px]">{t('involvementNote')}</p>
        {involvement.projects.length + involvement.activities.length === 0 ? (
          <p className="mt-2">{c('noData')}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...involvement.projects, ...involvement.activities].map((item) => (
              <li key={item.id} className="rounded-sm border border-line px-2 py-1">{item.name}</li>
            ))}
          </ul>
        )}

        <h3 className="mt-6 font-semibold">{t('request')}</h3>
        <div className="mt-2">
          <ActionForm action={sendInvolvementRequest} submitLabel={t('requestSend')} variant="secondary" resetOnSuccess>
            <Field label={t('requestTarget')} htmlFor="target">
              <select id="target" name="target" required className="input" defaultValue="">
                <option value="" disabled>—</option>
                <optgroup label={t('showProjects')}>
                  {allProjects.filter((p) => !joined.has(p.id)).map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
                </optgroup>
                <optgroup label={t('showActivities')}>
                  {allActivities.filter((a) => !joined.has(a.id)).map((a) => <option key={a.id} value={`activity:${a.id}`}>{a.name}</option>)}
                </optgroup>
              </select>
            </Field>
            <Field label={t('requestNote')} htmlFor="note"><textarea id="note" name="note" rows={2} maxLength={500} className="input" /></Field>
          </ActionForm>
        </div>

        {requests.length > 0 && (
          <>
            <h3 className="mt-6 font-semibold">{t('requests')}</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {requests.map(({ request, projectName, activityName }) => (
                <li key={request.id} className="flex flex-wrap justify-between gap-2 border-b border-line py-2">
                  <span className="text-heading">{projectName ?? activityName}</span>
                  <span>{t(request.status)}{request.decisionNote ? `: "${request.decisionNote}"` : ''}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <p><Link href="/account/password" className="font-semibold text-teal-text">{t('changePassword')}</Link></p>
    </div>
  );
}
