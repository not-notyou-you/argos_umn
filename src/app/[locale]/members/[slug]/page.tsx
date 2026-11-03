import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Cover, type CoverKind, MemberPortrait, StatusBadge } from '@/components/display';
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

  const current = member.status === 'onboarded' ? positions.find((p) => isPositionActive(p, today)) : undefined;
  const showProjects = member.showProjects && involvement.projects.length > 0;
  const showActivities = member.showActivities && involvement.activities.length > 0;

  const Item = ({ href, name, coverKey, meta, kind }: { href: string; name: string; coverKey: string | null; meta: React.ReactNode; kind: CoverKind }) => (
    <li>
      <Link href={href} className="group flex h-full items-center gap-4 rounded-md bg-surface-muted p-3 transition-colors hover:bg-line">
        <Cover storageKey={coverKey} alt="" sizes="112px" className="aspect-[4/3] w-28 shrink-0 rounded-sm" kind={kind} seed={name} />
        <span className="flex min-w-0 flex-col items-start gap-1">
          <span className="line-clamp-2 font-semibold text-heading group-hover:text-teal-text">{name}</span>
          {meta}
        </span>
      </Link>
    </li>
  );

  return (
    <>
      <section className="on-dark slash-move bg-ink pt-8 pb-14 text-white md:pb-20 lg:pb-24">
        <Container>
          <Link href={`${prefix}/members`} className="font-semibold text-[#d8dbdf] hover:text-white">← {t('back')}</Link>
          <div className="mt-10 lg:mt-14 lg:ml-[calc(320px+4rem)]">
            {current && <p className="text-lg font-bold text-brand-orange">{current.name}</p>}
            <h1 className="rise heading-xl mt-2 text-white">{member.fullName}</h1>
            <p className="mt-4 text-lg leading-8 text-[#d3d6da]">{[line, t(member.status)].filter(Boolean).join(' · ')}</p>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 pb-20 lg:grid-cols-[320px_1fr] lg:gap-16 md:pb-28">
        <div className="-mt-8 lg:-mt-48">
          <div className="on-dark cut-corner relative mx-auto aspect-[3/4] w-56 overflow-hidden bg-ink shadow-xl md:w-64 lg:sticky lg:top-[96px] lg:w-full">
            <MemberPortrait name={member.fullName} photoKey={member.showPhoto ? photoKey : null} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-14 lg:pt-14">
          {positions.length > 0 && (
            <section>
              <h2 className="text-2xl leading-8 font-bold">{t('positions')}</h2>
              <ol className="mt-6 flex flex-col gap-6 border-l-2 border-line pl-6">
                {positions.map((p, i) => {
                  const active = member.status === 'onboarded' && isPositionActive(p, today);
                  return (
                    <li key={i} className="relative">
                      <span aria-hidden className={`absolute top-1.5 -left-[33px] size-3.5 rounded-full ring-4 ring-surface ${active ? 'bg-brand-orange' : 'bg-brand-light-gray'}`} />
                      <p className="text-lg leading-7 font-semibold text-heading">{p.name}</p>
                      <p className="text-sm leading-6">{formatMonth(p.startDate, locale)} – {p.endDate ? formatMonth(p.endDate, locale) : t('now')}</p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {showProjects && (
            <section>
              <h2 className="text-2xl leading-8 font-bold">{t('projects')}</h2>
              <ul className="mt-6 grid gap-3 xl:grid-cols-2">
                {involvement.projects.map((p) => <Item key={p.id} href={`${prefix}/projects/${p.slug}`} name={p.name} kind="project" coverKey={p.coverKey} meta={<StatusBadge status={p.status} />} />)}
              </ul>
            </section>
          )}

          {showActivities && (
            <section>
              <h2 className="text-2xl leading-8 font-bold">{t('activities')}</h2>
              <ul className="mt-6 grid gap-3 xl:grid-cols-2">
                {involvement.activities.map((a) => <Item key={a.id} href={`${prefix}/activities/${a.slug}`} name={a.name} kind="activity" coverKey={a.coverKey} meta={<span className="text-sm">{formatDate(a.activityDate, locale)}</span>} />)}
              </ul>
            </section>
          )}
        </div>
      </Container>
    </>
  );
}
