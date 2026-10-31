import { desc, eq } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { accounts, auditLogs } from '@/db/schema';

export async function AuditTable({ limit }: { limit: number }) {
  const t = await getTranslations('committee');
  const locale = await getLocale();
  const rows = await db
    .select({ log: auditLogs, username: accounts.username })
    .from(auditLogs)
    .leftJoin(accounts, eq(accounts.id, auditLogs.actorAccountId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  const time = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full text-left text-sm leading-[22px]">
        <thead>
          <tr className="border-b border-line text-heading">
            <th className="p-3">{t('time')}</th>
            <th className="p-3">{t('actor')}</th>
            <th className="p-3">{t('action')}</th>
            <th className="p-3">{t('entity')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ log, username }) => (
            <tr key={log.id} className="border-b border-line last:border-0">
              <td className="p-3 whitespace-nowrap">{time.format(log.createdAt)}</td>
              <td className="p-3">{username ?? t('system')}</td>
              <td className="p-3"><code>{log.action}</code></td>
              <td className="p-3">{log.entityType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
