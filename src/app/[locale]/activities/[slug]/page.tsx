import { and, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { DetailPage } from '@/components/detail';
import { db } from '@/db';
import { activities } from '@/db/schema';
import { mediaKey, ownerMedia, participants } from '@/lib/queries';
import { excerpt, formatDate } from '@/lib/util';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };

const getActivity = async (slug: string) =>
  (await db.select().from(activities).where(and(eq(activities.slug, slug), eq(activities.isPublished, true))))[0];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const activity = await getActivity((await params).slug);
  return activity ? { title: activity.name, description: excerpt(activity.description, 160) } : {};
}

export default async function ActivityDetail({ params }: Props) {
  const activity = await getActivity((await params).slug);
  if (!activity) notFound();
  const t = await getTranslations('activity');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const [media, team, logoKey] = await Promise.all([
    ownerMedia({ activity: activity.id }),
    participants('activity', activity.id),
    mediaKey(activity.logoMediaId),
  ]);

  return (
    <DetailPage
      backHref={`${prefix}/activities`}
      backLabel={t('back')}
      name={activity.name}
      logoKey={logoKey}
      badge={<p className="font-semibold">{formatDate(activity.activityDate, locale)}</p>}
      media={media}
      aboutLabel={t('about')}
      description={activity.description}
      teamLabel={t('team')}
      team={team}
      memberPrefix={prefix}
    />
  );
}
