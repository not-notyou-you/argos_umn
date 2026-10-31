import { and, asc, eq, ilike } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createMember } from '@/actions/members';
import { ActionForm } from '@/components/forms';
import { Card, Field, PageHeader, buttonClass } from '@/components/ui';
import { db } from '@/db';
import { members } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';
import { latestPosition, positionsFor } from '@/lib/queries';

export const metadata = { title: 'Member' };

export default async function CommitteeMembers({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireCommittee();
  const { q, status } = await searchParams;
  const t = await getTranslations('committee');
  const m = await getTranslations('member');
  const c = await getTranslations('common');
  const filter = status === 'onboarded' || status === 'offboarded' ? status : undefined;
  const rows = await db
    .select()
    .from(members)
    .where(and(q ? ilike(members.fullName, `%${q.slice(0, 80)}%`) : undefined, filter ? eq(members.status, filter) : undefined))
    .orderBy(asc(members.fullName));
  const positions = await positionsFor(rows.map((r) => r.id));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title={t('members')} action={<Link href="/committee/members/positions" className={buttonClass('secondary')}>{t('managePositions')}</Link>} />

      <Card className="bg-white">
        <h2 className="pb-3 font-semibold text-ink">{t('newMember')}</h2>
        <ActionForm action={createMember} submitLabel={t('createMember')} resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={c('name')} htmlFor="fullName"><input id="fullName" name="fullName" required maxLength={120} className="input" /></Field>
            <Field label={t('username')} htmlFor="username"><input id="username" name="username" required pattern="[a-z0-9._\-]{3,40}" className="input" /></Field>
            <Field label={m('cohort')} htmlFor="cohort"><input id="cohort" name="cohort" type="number" min={2000} max={2100} className="input" /></Field>
            <Field label="Major" htmlFor="major"><input id="major" name="major" maxLength={120} className="input" /></Field>
          </div>
        </ActionForm>
      </Card>

      <form role="search" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} aria-label={t('searchMember')} placeholder={t('searchMember')} className="input max-w-64" />
        <select name="status" defaultValue={filter ?? ''} aria-label={c('status')} className="input max-w-48">
          <option value="">{t('allStatuses')}</option>
          <option value="onboarded">{m('onboarded')}</option>
          <option value="offboarded">{m('offboarded')}</option>
        </select>
        <button className={buttonClass('secondary')}>{c('search')}</button>
      </form>

      <ul className="flex flex-col gap-2">
        {rows.map((member) => (
          <li key={member.id}>
            <Link href={`/committee/members/${member.id}`} className="grid gap-1 rounded-md border border-line bg-white p-3 hover:border-teal-text sm:grid-cols-[1fr_100px_140px_110px]">
              <span className="font-semibold text-ink">{member.fullName}</span>
              <span>{member.cohort ?? '—'}</span>
              <span>{latestPosition(positions.get(member.id))?.name ?? '—'}</span>
              <span>{m(member.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
