import { asc } from 'drizzle-orm';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createPosition, deletePosition } from '@/actions/members';
import { ActionButton, ActionForm } from '@/components/forms';
import { Card, Field, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'Positions' };

export default async function PositionsPage() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const rows = await db.select().from(positions).orderBy(asc(positions.sortOrder), asc(positions.name));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/committee/members" className="font-semibold text-teal-text">← {t('members')}</Link>
      <PageHeader title={t('managePositions')} />
      <Card className="bg-white">
        <ActionForm action={createPosition} submitLabel={t('addPosition')} resetOnSuccess>
          <Field label={t('positionName')} htmlFor="name"><input id="name" name="name" required maxLength={60} className="input" /></Field>
        </ActionForm>
      </Card>
      <ul className="flex flex-col gap-2">
        {rows.map((position) => (
          <li key={position.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-white p-3">
            <span>
              <span className="font-semibold text-ink">{position.name}</span>
              {position.grantsCommittee && <span className="ml-2 text-sm text-teal-text">{t('grantsAccess')}</span>}
            </span>
            {position.isLocked ? <span className="text-sm">{t('builtIn')}</span> : <ActionButton action={deletePosition.bind(null, position.id)} label={c('delete')} variant="danger" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
