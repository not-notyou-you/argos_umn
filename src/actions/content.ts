'use server';

import { and, count, eq, inArray } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import { activities, activityMembers, media, projectMembers, projects } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireCommittee, requireProjectEditor } from '@/lib/auth';
import { MediaError, type Owner, addGalleryItem, assertCapacity, ensureCover, fetchDriveImage } from '@/lib/media';
import { parseDriveId, parseYouTubeId, safeHttpUrl, slugify } from '@/lib/util';
import type { ActionResult } from './types';

const uuid = z.uuid();

async function uniqueSlug(table: typeof projects | typeof activities, name: string) {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [row] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug));
    if (!row) return slug;
  }
}

const authorizeOwner = (owner: Owner) => (owner.type === 'project' ? requireProjectEditor(owner.id) : requireCommittee());

const content = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(10_000) });

/**
 * Dipakai anggota project dan komite. Skema ini sengaja tidak memuat status,
 * publikasi, atau daftar anggota; ketiganya hanya lewat updateProjectAdmin.
 */
const projectContent = content.extend({
  projectUrl: z.string().trim().max(500),
  projectUrlVisible: z.boolean(),
  githubUrl: z.string().trim().max(500),
  githubUrlVisible: z.boolean(),
  docsUrl: z.string().trim().max(500),
  docsUrlVisible: z.boolean(),
});

export async function updateProjectContent(projectId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireProjectEditor(uuid.parse(projectId));
  const parsed = projectContent.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    projectUrl: formData.get('projectUrl') ?? '',
    projectUrlVisible: formData.get('projectUrlVisible') === 'on',
    githubUrl: formData.get('githubUrl') ?? '',
    githubUrlVisible: formData.get('githubUrlVisible') === 'on',
    docsUrl: formData.get('docsUrl') ?? '',
    docsUrlVisible: formData.get('docsUrlVisible') === 'on',
  });
  if (!parsed.success) return { error: 'common.invalid' };
  const data = parsed.data;

  const links = {} as Record<'projectUrl' | 'githubUrl' | 'docsUrl', string | null>;
  for (const key of ['projectUrl', 'githubUrl', 'docsUrl'] as const) {
    const url = data[key] ? safeHttpUrl(data[key]) : null;
    if (data[key] && !url) return { error: 'common.invalidUrl' };
    if (data[`${key}Visible`] && !url) return { error: 'editor.buttonNeedsUrl' };
    links[key] = url;
  }

  await db.update(projects).set({ ...data, ...links }).where(eq(projects.id, projectId));
  await audit(user.accountId, 'project.update_content', 'project', projectId, { name: data.name });
  return { ok: true };
}

const projectAdmin = z.object({
  status: z.enum(['done', 'on_progress', 'cancelled']),
  memberIds: z.array(uuid),
});

async function setPublished(table: typeof projects | typeof activities, id: string, publish: boolean) {
  await db.update(table).set({ isPublished: publish, publishedAt: publish ? new Date() : null }).where(eq(table.id, id));
}

export async function updateProjectAdmin(projectId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  uuid.parse(projectId);
  const parsed = projectAdmin.safeParse({ status: formData.get('status'), memberIds: formData.getAll('memberIds') });
  if (!parsed.success) return { error: 'common.invalid' };
  const { status, memberIds } = parsed.data;

  await db.transaction(async (tx) => {
    await tx.update(projects).set({ status }).where(eq(projects.id, projectId));
    await tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    if (memberIds.length) await tx.insert(projectMembers).values(memberIds.map((memberId) => ({ projectId, memberId })));
  });
  await audit(user.accountId, 'project.update_admin', 'project', projectId, { status, memberCount: memberIds.length });
  return { ok: true };
}

export async function setProjectPublished(projectId: string, publish: boolean): Promise<ActionResult> {
  const user = await requireCommittee();
  await setPublished(projects, uuid.parse(projectId), publish);
  await audit(user.accountId, publish ? 'project.publish' : 'project.unpublish', 'project', projectId);
  return { ok: true };
}

export async function createProject(formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const name = z.string().trim().min(1).max(120).safeParse(formData.get('name'));
  if (!name.success) return { error: 'common.invalid' };
  const [project] = await db.insert(projects).values({ name: name.data, slug: await uniqueSlug(projects, name.data) }).returning();
  await audit(user.accountId, 'project.create', 'project', project.id, { name: name.data });
  redirect(`/committee/projects/${project.id}`);
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const [project] = await db.delete(projects).where(eq(projects.id, uuid.parse(projectId))).returning();
  await audit(user.accountId, 'project.delete', 'project', projectId, { name: project?.name });
  redirect('/committee/projects');
}

const activityInput = content.extend({ activityDate: z.iso.date(), memberIds: z.array(uuid) });

export async function createActivity(formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const parsed = z
    .object({ name: z.string().trim().min(1).max(120), activityDate: z.iso.date() })
    .safeParse({ name: formData.get('name'), activityDate: formData.get('activityDate') });
  if (!parsed.success) return { error: 'common.invalid' };
  const [activity] = await db
    .insert(activities)
    .values({ ...parsed.data, slug: await uniqueSlug(activities, parsed.data.name) })
    .returning();
  await audit(user.accountId, 'activity.create', 'activity', activity.id, { name: parsed.data.name });
  redirect(`/committee/activities/${activity.id}`);
}

export async function updateActivity(activityId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  uuid.parse(activityId);
  const parsed = activityInput.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    activityDate: formData.get('activityDate'),
    memberIds: formData.getAll('memberIds'),
  });
  if (!parsed.success) return { error: 'common.invalid' };
  const { memberIds, ...data } = parsed.data;

  await db.transaction(async (tx) => {
    await tx.update(activities).set(data).where(eq(activities.id, activityId));
    await tx.delete(activityMembers).where(eq(activityMembers.activityId, activityId));
    if (memberIds.length) await tx.insert(activityMembers).values(memberIds.map((memberId) => ({ activityId, memberId })));
  });
  await audit(user.accountId, 'activity.update', 'activity', activityId, { name: data.name, memberCount: memberIds.length });
  return { ok: true };
}

export async function setActivityPublished(activityId: string, publish: boolean): Promise<ActionResult> {
  const user = await requireCommittee();
  await setPublished(activities, uuid.parse(activityId), publish);
  await audit(user.accountId, publish ? 'activity.publish' : 'activity.unpublish', 'activity', activityId);
  return { ok: true };
}

export async function deleteActivity(activityId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const [activity] = await db.delete(activities).where(eq(activities.id, uuid.parse(activityId))).returning();
  await audit(user.accountId, 'activity.delete', 'activity', activityId, { name: activity?.name });
  redirect('/committee/activities');
}

const ownerSchema = z.object({ type: z.enum(['project', 'activity']), id: uuid });

async function loadOwnedItem(owner: Owner, mediaId: string) {
  const column = owner.type === 'project' ? media.projectId : media.activityId;
  const [item] = await db.select().from(media).where(and(eq(media.id, uuid.parse(mediaId)), eq(column, owner.id)));
  return item;
}

/** Tautan YouTube selalu video. Tautan Drive bisa video (embed) atau foto (disalin ke server). */
export async function addMediaLink(rawOwner: Owner, kind: 'image' | 'video', link: string): Promise<ActionResult> {
  const owner = ownerSchema.parse(rawOwner);
  const user = await authorizeOwner(owner);
  try {
    await assertCapacity(owner, kind);
    if (kind === 'image') {
      const id = parseDriveId(link);
      if (!id) return { error: 'editor.badLink' };
      await addGalleryItem(owner, { kind, source: 'drive', externalId: id, ...(await fetchDriveImage(id)) });
    } else {
      const youtubeId = parseYouTubeId(link);
      const driveId = youtubeId ? null : parseDriveId(link);
      if (!youtubeId && !driveId) return { error: 'editor.badLink' };
      await addGalleryItem(owner, { kind, source: youtubeId ? 'youtube' : 'drive', externalId: youtubeId ?? driveId });
    }
  } catch (error) {
    if (error instanceof MediaError) return { error: `editor.${error.code}` };
    throw error;
  }
  await audit(user.accountId, 'media.add_link', owner.type, owner.id, { kind });
  return { ok: true };
}

export async function deleteMedia(rawOwner: Owner, mediaId: string): Promise<ActionResult> {
  const owner = ownerSchema.parse(rawOwner);
  const user = await authorizeOwner(owner);
  const item = await loadOwnedItem(owner, mediaId);
  if (!item) return { error: 'common.error' };
  await db.delete(media).where(eq(media.id, item.id));
  await ensureCover(owner);
  await audit(user.accountId, 'media.delete', owner.type, owner.id, { mediaId });
  return { ok: true };
}

export async function setCover(rawOwner: Owner, mediaId: string): Promise<ActionResult> {
  const owner = ownerSchema.parse(rawOwner);
  await authorizeOwner(owner);
  const item = await loadOwnedItem(owner, mediaId);
  if (item?.kind !== 'image') return { error: 'common.error' };
  const column = owner.type === 'project' ? media.projectId : media.activityId;
  await db.transaction(async (tx) => {
    await tx.update(media).set({ isCover: false }).where(and(eq(column, owner.id), eq(media.isCover, true)));
    await tx.update(media).set({ isCover: true }).where(eq(media.id, item.id));
  });
  return { ok: true };
}

export async function reorderMedia(rawOwner: Owner, ids: string[]): Promise<ActionResult> {
  const owner = ownerSchema.parse(rawOwner);
  await authorizeOwner(owner);
  const list = z.array(uuid).max(20).parse(ids);
  const column = owner.type === 'project' ? media.projectId : media.activityId;
  const [{ n }] = await db.select({ n: count() }).from(media).where(and(eq(column, owner.id), inArray(media.id, list)));
  if (n !== list.length) return { error: 'common.error' };
  await db.transaction(async (tx) => {
    for (const [i, id] of list.entries()) await tx.update(media).set({ sortOrder: i }).where(eq(media.id, id));
  });
  return { ok: true };
}

export async function updateMediaAlt(rawOwner: Owner, mediaId: string, altText: string): Promise<ActionResult> {
  const owner = ownerSchema.parse(rawOwner);
  await authorizeOwner(owner);
  const item = await loadOwnedItem(owner, mediaId);
  if (!item) return { error: 'common.error' };
  await db.update(media).set({ altText: altText.trim().slice(0, 200) || null }).where(eq(media.id, item.id));
  return { ok: true };
}
