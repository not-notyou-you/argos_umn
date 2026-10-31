import { asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { resetPassword } from '@/actions/members';
import { ActionButton } from '@/components/forms';
import { Notice, PageHeader, buttonClass } from '@/components/ui';
import { db } from '@/db';
import { accounts } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'System Accounts' };

export default async function SystemPage() {
  const user = await requireCommittee();
  const t = await getTranslations('committee');
  const auth = await getTranslations('auth');
  const locale = await getLocale();
  const rows = await db.select().from(accounts).where(eq(accounts.kind, 'system')).orderBy(asc(accounts.username));
  const time = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <PageHeader title={t('system')} />
      <Notice>{t('protected')} {t('seederOnly')}</Notice>
      <ul className="flex flex-col gap-2">
        {rows.map((account) => (
          <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
            <div>
              <p className="font-semibold text-ink">{account.username}</p>
              <p className="text-sm leading-[22px]">{t('lastLogin')}: {account.lastLoginAt ? time.format(account.lastLoginAt) : t('never')}</p>
            </div>
            {account.id === user.accountId ? (
              <Link href="/account/password" className={buttonClass('secondary')}>{auth('changeTitle')}</Link>
            ) : (
              user.kind === 'system' && <ActionButton action={resetPassword.bind(null, account.id)} label={t('resetPassword')} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
