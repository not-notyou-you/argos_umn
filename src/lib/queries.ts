import 'server-only';
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '@/db';
import {
  activities,
  activityMembers,
  carouselSlides,
  media,
  memberPositions,
  members,
  positions,
  projectMembers,
  projects,
  siteContent,
} from '@/db/schema';
import { type AboutContent, DEFAULT_ABOUT } from './about-defaults';
import { isPositionActive, todayInJakarta } from './access';

const coverMedia = alias(media, 'cover_media');
const logoMedia = alias(media, 'logo_media');

export async function getAbout(): Promise<AboutContent> {
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, 'about'));
  return { ...DEFAULT_ABOUT, ...((row?.value as Partial<AboutContent>) ?? {}) };
}

export async function getCarousel({ activeOnly = true } = {}) {
  return db
    .select({ slide: carouselSlides, storageKey: media.storageKey, altText: media.altText })
    .from(carouselSlides)
    .innerJoin(media, eq(media.id, carouselSlides.mediaId))
    .where(activeOnly ? eq(carouselSlides.isActive, true) : undefined)
    .orderBy(asc(carouselSlides.sortOrder));
}

type ProjectFilter = { status?: 'done' | 'on_progress' | 'cancelled'; q?: string; limit?: number };

export async function listProjects({ status, q, limit }: ProjectFilter = {}) {
  const query = db
    .select({ project: projects, coverKey: coverMedia.storageKey, logoKey: logoMedia.storageKey })
    .from(projects)
    .leftJoin(coverMedia, and(eq(coverMedia.projectId, projects.id), eq(coverMedia.isCover, true)))
    .leftJoin(logoMedia, eq(logoMedia.id, projects.logoMediaId))
    .where(
      and(
        eq(projects.isPublished, true),
        status ? eq(projects.status, status) : undefined,
        q ? ilike(projects.name, `%${q}%`) : undefined,
      ),
    )
    .orderBy(desc(projects.publishedAt));
  return limit ? query.limit(limit) : query;
}

export async function listActivities({ q, limit }: { q?: string; limit?: number } = {}) {
  const query = db
    .select({ activity: activities, coverKey: coverMedia.storageKey, logoKey: logoMedia.storageKey })
    .from(activities)
    .leftJoin(coverMedia, and(eq(coverMedia.activityId, activities.id), eq(coverMedia.isCover, true)))
    .leftJoin(logoMedia, eq(logoMedia.id, activities.logoMediaId))
    .where(and(eq(activities.isPublished, true), q ? ilike(activities.name, `%${q}%`) : undefined))
    .orderBy(desc(activities.activityDate));
  return limit ? query.limit(limit) : query;
}

export async function ownerMedia(owner: { project?: string; activity?: string }) {
  return db
    .select()
    .from(media)
    .where(
      and(
        eq(media.purpose, 'gallery'),
        owner.project ? eq(media.projectId, owner.project) : eq(media.activityId, owner.activity!),
      ),
    )
    .orderBy(desc(media.isCover), asc(media.sortOrder));
}

export async function mediaKey(id: string | null) {
  if (!id) return null;
  const [row] = await db.select({ storageKey: media.storageKey }).from(media).where(eq(media.id, id));
  return row?.storageKey ?? null;
}

const memberCard = {
  id: members.id,
  slug: members.slug,
  fullName: members.fullName,
  major: members.major,
  cohort: members.cohort,
  status: members.status,
  showPhoto: members.showPhoto,
  showMajor: members.showMajor,
  showCohort: members.showCohort,
  showPositions: members.showPositions,
  photoKey: media.storageKey,
};

export async function participants(table: 'project' | 'activity', id: string) {
  const join = table === 'project' ? projectMembers : activityMembers;
  const rows = await db
    .select(memberCard)
    .from(members)
    .innerJoin(
      join,
      and(eq(join.memberId, members.id), table === 'project' ? eq(projectMembers.projectId, id) : eq(activityMembers.activityId, id)),
    )
    .leftJoin(media, eq(media.id, members.photoMediaId))
    .orderBy(asc(members.fullName));
  return rows;
}

export type PublicPosition = { name: string; startDate: string; endDate: string | null };

export async function positionsFor(memberIds: string[]) {
  const map = new Map<string, PublicPosition[]>();
  if (memberIds.length === 0) return map;
  const rows = await db
    .select({
      memberId: memberPositions.memberId,
      name: positions.name,
      startDate: memberPositions.startDate,
      endDate: memberPositions.endDate,
      sortOrder: positions.sortOrder,
    })
    .from(memberPositions)
    .innerJoin(positions, eq(positions.id, memberPositions.positionId))
    .where(inArray(memberPositions.memberId, memberIds))
    .orderBy(desc(memberPositions.startDate), asc(positions.sortOrder));
  for (const row of rows) map.set(row.memberId, [...(map.get(row.memberId) ?? []), row]);
  return map;
}

/** Posisi yang ditampilkan di kartu: yang berlaku saat ini, atau yang terakhir. */
export function latestPosition(list: PublicPosition[] = []) {
  const today = todayInJakarta();
  return list.find((p) => isPositionActive(p, today)) ?? list[0] ?? null;
}

export async function listMembers(status: 'onboarded' | 'offboarded', q?: string, cohort?: number) {
  const rows = await db
    .select(memberCard)
    .from(members)
    .leftJoin(media, eq(media.id, members.photoMediaId))
    .where(
      and(
        eq(members.status, status),
        q ? ilike(members.fullName, `%${q}%`) : undefined,
        cohort ? and(eq(members.cohort, cohort), eq(members.showCohort, true)) : undefined,
      ),
    )
    .orderBy(asc(members.fullName));
  return rows;
}

export async function memberCounts() {
  const rows = await db.select({ status: members.status, n: sql<number>`count(*)::int` }).from(members).groupBy(members.status);
  return {
    onboarded: rows.find((r) => r.status === 'onboarded')?.n ?? 0,
    offboarded: rows.find((r) => r.status === 'offboarded')?.n ?? 0,
  };
}

export async function publicCohorts() {
  const rows = await db
    .selectDistinct({ cohort: members.cohort })
    .from(members)
    .where(and(eq(members.showCohort, true), sql`${members.cohort} is not null`))
    .orderBy(desc(members.cohort));
  return rows.map((r) => r.cohort!);
}

export async function memberInvolvement(memberId: string, { publishedOnly = true } = {}) {
  const [projectRows, activityRows] = await Promise.all([
    db
      .select({ id: projects.id, slug: projects.slug, name: projects.name, status: projects.status, coverKey: coverMedia.storageKey })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .leftJoin(coverMedia, and(eq(coverMedia.projectId, projects.id), eq(coverMedia.isCover, true)))
      .where(and(eq(projectMembers.memberId, memberId), publishedOnly ? eq(projects.isPublished, true) : undefined))
      .orderBy(asc(projects.name)),
    db
      .select({ id: activities.id, slug: activities.slug, name: activities.name, activityDate: activities.activityDate, coverKey: coverMedia.storageKey })
      .from(activityMembers)
      .innerJoin(activities, eq(activities.id, activityMembers.activityId))
      .leftJoin(coverMedia, and(eq(coverMedia.activityId, activities.id), eq(coverMedia.isCover, true)))
      .where(and(eq(activityMembers.memberId, memberId), publishedOnly ? eq(activities.isPublished, true) : undefined))
      .orderBy(desc(activities.activityDate)),
  ]);
  return { projects: projectRows, activities: activityRows };
}

// Tanggal kejadian: tanggal aktivitas, atau tanggal upload untuk media project.
const galleryDate = sql<string>`coalesce(${activities.activityDate}, (${media.createdAt} at time zone 'Asia/Jakarta')::date)`;
const galleryPublished = or(eq(projects.isPublished, true), eq(activities.isPublished, true));

export async function galleryItems(filter: 'all' | 'project' | 'activity', limit: number, period: { year?: number; month?: number } = {}) {
  const rows = await db
    .select({
      media,
      date: sql<string>`to_char(${galleryDate}, 'YYYY-MM-DD')`,
      projectName: projects.name,
      projectSlug: projects.slug,
      activityName: activities.name,
      activitySlug: activities.slug,
    })
    .from(media)
    .leftJoin(projects, eq(projects.id, media.projectId))
    .leftJoin(activities, eq(activities.id, media.activityId))
    .where(
      and(
        eq(media.purpose, 'gallery'),
        filter === 'project'
          ? eq(projects.isPublished, true)
          : filter === 'activity'
            ? eq(activities.isPublished, true)
            : galleryPublished,
        period.year ? sql`extract(year from ${galleryDate}) = ${period.year}` : undefined,
        period.month ? sql`extract(month from ${galleryDate}) = ${period.month}` : undefined,
      ),
    )
    .orderBy(desc(galleryDate), asc(media.sortOrder))
    .limit(limit + 1);
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}

/** Pasangan tahun dan bulan yang punya media, untuk mengisi filter. */
export async function galleryPeriods() {
  const rows = await db
    .selectDistinct({
      year: sql<number>`extract(year from ${galleryDate})::int`,
      month: sql<number>`extract(month from ${galleryDate})::int`,
    })
    .from(media)
    .leftJoin(projects, eq(projects.id, media.projectId))
    .leftJoin(activities, eq(activities.id, media.activityId))
    .where(and(eq(media.purpose, 'gallery'), galleryPublished));
  return rows;
}

export async function homeStats() {
  const [row] = await db.execute<{ projects: number; activities: number; members: number; media: number }>(sql`
    select
      (select count(*)::int from projects where is_published) as projects,
      (select count(*)::int from activities where is_published) as activities,
      (select count(*)::int from members where status = 'onboarded') as members,
      (select count(*)::int from media where purpose = 'gallery') as media
  `);
  return row;
}
