import { getTranslations } from 'next-intl/server';
import { AuditTable } from '@/components/audit-table';
import { PageHeader } from '@/components/ui';
import { requireCommittee } from '@/lib/auth';

export const metadata = { title: 'Audit Log' };

export default async function AuditPage() {
  await requireCommittee();
  const t = await getTranslations('committee');
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={t('audit')} />
      <AuditTable limit={200} />
    </div>
  );
}
