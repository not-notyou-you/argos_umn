import { asc, desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { z } from 'zod';
import {
  addMemberPosition,
  deleteMember,
  deleteMemberPosition,
  resetPassword,
  setAccountActive,
  setMemberInvolvement,
  setMemberStatus,
  updateMemberPosition,
  updateMemberProfile,
} from '@/actions/members';
import { Avatar } from '@/components/display';
import { ActionButton, ActionForm, CheckList, ConfirmDelete, ImageUpload } from '@/components/forms';
import { Card, Field, PageHeader, Notice } from '@/components/ui';
import { db } from '@/db';
import { accounts, activities, media, memberPositions, members, positions, projects } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { memberInvolvement } from '@/lib/queries';

type Option = { id: string; name: string; grantsCommittee: boolean };

async function PositionFields({ options, position, start, end }: { options: Option[]; position?: string; start?: string; end?: string }) {
  const t = await getTranslations('committee');
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="flex flex-col gap-1 font-semibold text-heading">{t('position')}
        <select name="positionId" defaultValue={position} required className="input">
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-semibold text-heading">{t('startMonth')}
        <input type="month" name="start" defaultValue={start} required className="input" />
      </label>
      <label className="flex flex-col gap-1 font-semibold text-heading">{t('endMonth')}
        <input type="month" name="end" defaultValue={end} className="input" />
      </label>
    </div>
  );
}

export default async function EditMember({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const user = await requireCommittee();
  const { id } = await params;
  const { tab = 'profile' } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const [row] = await db
    .select({ member: members, account: accounts, photoKey: media.storageKey })
    .from(members)
    .innerJoin(accounts, eq(accounts.id, members.accountId))
    .leftJoin(media, eq(media.id, members.photoMediaId))
    .where(eq(members.id, id));
  if (!row) notFound();
  const { member, account, photoKey } = row;

  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const m = await getTranslations('member');
  const me = await getTranslations('me');
  const locale = await getLocale();

  const tabs = [
    { value: 'profile', label: t('tabProfile') },
    { value: 'positions', label: t('tabPositions') },
    { value: 'involvement', label: t('tabInvolvement') },
    { value: 'account', label: t('tabAccount') },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/committee/members" className="font-semibold text-teal-text">← {t('members')}</Link>
      <PageHeader title={member.fullName} intro={m(member.status)} action={<ConfirmDelete name={member.fullName} action={deleteMember.bind(null, id)} />} />

      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link key={item.value} href={`?tab=${item.value}`} aria-current={tab === item.value ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-sm border px-3 font-semibold ${tab === item.value ? 'border-teal-text bg-teal-solid text-white' : 'border-line bg-surface'}`}>{item.label}</Link>
        ))}
      </nav>

      {tab === 'profile' && (
        <>
          <Card className="bg-surface">
            <div className="flex items-center gap-4 pb-4">
              <Avatar name={member.fullName} photoKey={photoKey} size={96} />
              <ImageUpload purpose="avatar" ownerType="member" ownerId={id} label={c('change')} />
            </div>
            <ActionForm action={updateMemberProfile.bind(null, id)} submitLabel={c('save')}>
              <Field label={c('name')} htmlFor="fullName"><input id="fullName" name="fullName" required maxLength={120} defaultValue={member.fullName} className="input" /></Field>
              <Field label={me('major')} htmlFor="major"><input id="major" name="major" maxLength={120} defaultValue={member.major} className="input" /></Field>
              <Field label={me('cohort')} htmlFor="cohort"><input id="cohort" name="cohort" type="number" min={2000} max={2100} defaultValue={member.cohort ?? ''} className="input" /></Field>
            </ActionForm>
          </Card>
          <Card className="bg-surface">
            <h2 className="pb-2 font-semibold text-heading">{t('statusChange')}</h2>
            <p className="pb-3">{t('offboardWarn')}</p>
            {member.status === 'onboarded' ? (
              <ActionButton action={setMemberStatus.bind(null, id, 'offboarded')} label={t('offboard')} variant="danger" confirmText={t('offboardWarn')} />
            ) : (
              <ActionButton action={setMemberStatus.bind(null, id, 'onboarded')} label={t('onboard')} />
            )}
          </Card>
        </>
      )}

      {tab === 'positions' && <PositionsTab memberId={id} />}
      {tab === 'involvement' && <InvolvementTab memberId={id} />}

      {tab === 'account' && (
        <Card className="flex flex-col gap-4 bg-surface">
          <dl className="grid gap-1 sm:grid-cols-[160px_1fr]">
            <dt className="font-semibold text-heading">{t('username')}</dt><dd>{account.username}</dd>
            <dt className="font-semibold text-heading">{c('status')}</dt><dd>{account.isActive ? t('accountActive') : t('accountInactive')}</dd>
            <dt className="font-semibold text-heading">{t('lastLogin')}</dt>
            <dd>{account.lastLoginAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(account.lastLoginAt) : t('never')}</dd>
          </dl>
          <div className="flex flex-wrap gap-3">
            <ActionButton action={resetPassword.bind(null, account.id)} label={t('resetPassword')} />
            {account.id !== user.accountId && <ActionButton action={setAccountActive.bind(null, account.id, !account.isActive)} label={account.isActive ? t('deactivate') : t('activate')} />}
          </div>
        </Card>
      )}
    </div>
  );
}

async function PositionsTab({ memberId }: { memberId: string }) {
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const [options, entries] = await Promise.all([
    db.select({ id: positions.id, name: positions.name, grantsCommittee: positions.grantsCommittee }).from(positions).orderBy(asc(positions.sortOrder), asc(positions.name)),
    db.select().from(memberPositions).where(eq(memberPositions.memberId, memberId)).orderBy(desc(memberPositions.startDate)),
  ]);
  return (
    <>
      <Notice>{t('accessHelp')}</Notice>
      {entries.map((entry) => (
        <Card key={entry.id} className="bg-surface">
          <ActionForm action={updateMemberPosition.bind(null, entry.id)} submitLabel={c('save')} variant="secondary">
            <PositionFields options={options} position={entry.positionId} start={entry.startDate.slice(0, 7)} end={entry.endDate?.slice(0, 7)} />
          </ActionForm>
          <div className="pt-2"><ActionButton action={deleteMemberPosition.bind(null, entry.id)} label={c('delete')} variant="danger" /></div>
        </Card>
      ))}
      <Card className="bg-surface">
        <h2 className="pb-3 font-semibold text-heading">{t('addPosition')}</h2>
        <ActionForm action={addMemberPosition.bind(null, memberId)} submitLabel={t('addPosition')} resetOnSuccess>
          <PositionFields options={options} />
        </ActionForm>
      </Card>
    </>
  );
}

async function InvolvementTab({ memberId }: { memberId: string }) {
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const [allProjects, allActivities, current] = await Promise.all([
    db.select({ id: projects.id, label: projects.name }).from(projects).orderBy(asc(projects.name)),
    db.select({ id: activities.id, label: activities.name }).from(activities).orderBy(asc(activities.name)),
    memberInvolvement(memberId, { publishedOnly: false }),
  ]);
  return (
    <Card className="bg-surface">
      <ActionForm action={setMemberInvolvement.bind(null, memberId)} submitLabel={c('save')}>
        <CheckList name="projectIds" label={t('projects')} options={allProjects} selected={new Set(current.projects.map((p) => p.id))} />
        <CheckList name="activityIds" label={t('activities')} options={allActivities} selected={new Set(current.activities.map((a) => a.id))} />
      </ActionForm>
    </Card>
  );
}
