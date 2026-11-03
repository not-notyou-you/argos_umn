import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ProposalForm } from '@/components/proposal-form';
import { Card, PageHeader } from '@/components/ui';
import { db } from '@/db';
import { projectProposals } from '@/db/schema';
import { requireMember } from '@/lib/auth';
import { formatDate } from '@/lib/util';

export const metadata = { title: 'Usulan Project' };

export default async function MyProposalsPage() {
  const user = await requireMember();
  const t = await getTranslations('proposal');
  const me = await getTranslations('me');
  const locale = await getLocale();
  const proposals = await db
    .select()
    .from(projectProposals)
    .where(eq(projectProposals.memberId, user.memberId))
    .orderBy(desc(projectProposals.createdAt));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      <Card className="bg-surface">
        <ProposalForm />
      </Card>

      {proposals.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[22px] leading-[30px] font-semibold">{t('mine')}</h2>
          {proposals.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2 bg-surface">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl leading-7 font-semibold">{p.name}</h3>
                <span className={`font-semibold ${p.status === 'rejected' ? 'text-danger' : p.status === 'approved' ? 'text-teal-text' : ''}`}>{me(p.status)}</span>
              </div>
              <p className="text-sm leading-[22px]">{t('submittedOn', { date: formatDate(p.createdAt.toISOString().slice(0, 10), locale), n: p.timeline.length })}</p>
              {p.status === 'rejected' && p.decisionNote && (
                <div className="rounded-sm border-l-4 border-danger bg-danger-soft p-3">
                  <p className="font-semibold text-heading">{t('feedback')}</p>
                  <p className="prose-text">{p.decisionNote}</p>
                </div>
              )}
              {p.status === 'approved' && (
                <p>
                  {p.decisionNote && <span className="prose-text">“{p.decisionNote}” </span>}
                  {p.projectId && <Link href={`/me/projects/${p.projectId}`} className="font-semibold text-teal-text">{t('openProject')}</Link>}
                </p>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
