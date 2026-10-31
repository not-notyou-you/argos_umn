import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Avatar, Cover, StatusBadge } from '@/components/display';
import { Container } from '@/components/ui';
import { db } from '@/db';
import { media, members } from '@/db/schema';
import { isPositionActive, todayInJakarta } from '@/lib/access';
import { memberInvolvement, positionsFor } from '@/lib/queries';
import { formatDate, formatMonth } from '@/lib/util';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

const getMember = async (slug: string) =>
  (
    await db
      .select({ member: members, photoKey: media.storageKey })
      .from(members)
      .leftJoin(media, eq(media.id, members.photoMediaId))
      .where(eq(members.slug, slug))
  )[0];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await getMember((await params).slug);
  return row ? { title: row.member.fullName } : {};
}

export default async function MemberDetail({ params }: Props) {
  const row = await getMember((await params).slug);
  if (!row) notFound();
  const { member, photoKey } = row;
  const t = await getTranslations('member');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const positions = member.showPositions ? ((await positionsFor([member.id])).get(member.id) ?? []) : [];
  const involvement = await memberInvolvement(member.id);
  const today = todayInJakarta();
  const line = [member.showMajor ? member.major : '', member.showCohort && member.cohort ? t('cohortOf', { year: member.cohort }) : ''].filter(Boolean).join(' · ');

  const Item = ({ href, name, coverKey, meta }: { href: string; name: string; coverKey: string | null; meta: React.ReactNode }) => (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-md border border-line p-2 hover:border-teal-text">
        <Cover storageKey={coverKey} alt="" sizes="80px" className="h-14 w-20 shrink-0 rounded-sm" />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{name}</span>
          {meta}
        </span>
      </Link>
    </li>
  );

  return (
    <Container className="py-8 md:py-12">
      <Link href={`${prefix}/members`} className="font-semibold text-teal-text">← {t('back')}</Link>
      <div className="flex flex-wrap items-center gap-6 py-6">
        <Avatar name={member.fullName} photoKey={member.showPhoto ? photoKey : null} size={140} />
        <div>
          <h1 className="text-[30px] leading-[38px] font-bold md:text-[40px] md:leading-[48px]">{member.fullName}</h1>
          {line && <p className="mt-1">{line}</p>}
          <p className="label mt-2 text-teal-text">{t(member.status)}</p>
        </div>
      </div>

      {positions.length > 0 && (
        <section className="py-4">
          <h2 className="label text-orange-text">{t('positions')}</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {positions.map((p, i) => {
              const current = member.status === 'onboarded' && isPositionActive(p, today);
              return (
                <li key={i} className="flex flex-wrap items-center gap-x-3">
                  <span aria-hidden className={`size-2.5 rounded-full ${current ? 'bg-brand-orange' : 'border border-brand-dark-gray'}`} />
                  <span className="font-semibold text-ink">{p.name}</span>
                  <span>{formatMonth(p.startDate, locale)} – {p.endDate ? formatMonth(p.endDate, locale) : t('now')}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <div className="grid gap-8 py-4 md:grid-cols-2">
        {member.showProjects && involvement.projects.length > 0 && (
          <section>
            <h2 className="label text-orange-text">{t('projects')}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {involvement.projects.map((p) => <Item key={p.id} href={`${prefix}/projects/${p.slug}`} name={p.name} coverKey={p.coverKey} meta={<StatusBadge status={p.status} />} />)}
            </ul>
          </section>
        )}
        {member.showActivities && involvement.activities.length > 0 && (
          <section>
            <h2 className="label text-orange-text">{t('activities')}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {involvement.activities.map((a) => <Item key={a.id} href={`${prefix}/activities/${a.slug}`} name={a.name} coverKey={a.coverKey} meta={<span className="text-sm">{formatDate(a.activityDate, locale)}</span>} />)}
            </ul>
          </section>
        )}
      </div>
    </Container>
  );
}
