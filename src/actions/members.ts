'use server';

import { and, count, eq } from 'drizzle-orm';
import { forbidden, redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/db';
import {
  accounts,
  activities,
  activityMembers,
  involvementRequests,
  memberPositions,
  members,
  positions,
  projectMembers,
  projects,
  sessions,
} from '@/db/schema';
import { monthEnd, monthStart, todayInJakarta } from '@/lib/access';
import { audit } from '@/lib/audit';
import { requireCommittee, requireMember } from '@/lib/auth';
import { hashPassword, temporaryPassword } from '@/lib/password';
import { slugify } from '@/lib/util';
import type { ActionResult } from './types';

const uuid = z.uuid();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const cohort = z.preprocess((v) => (v === '' || v === null ? null : Number(v)), z.number().int().min(2000).max(2100).nullable());
const profile = z.object({ fullName: z.string().trim().min(1).max(120), major: z.string().trim().max(120), cohort });

async function uniqueMemberSlug(name: string) {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [row] = await db.select({ id: members.id }).from(members).where(eq(members.slug, slug));
    if (!row) return slug;
  }
}

export async function updateMyProfile(formData: FormData): Promise<ActionResult> {
  const user = await requireMember();
  const parsed = profile.safeParse({ fullName: formData.get('fullName'), major: formData.get('major'), cohort: formData.get('cohort') });
  if (!parsed.success) return { error: 'common.invalid' };
  await db
    .update(members)
    .set({
      ...parsed.data,
      showPhoto: formData.get('showPhoto') === 'on',
      showMajor: formData.get('showMajor') === 'on',
      showCohort: formData.get('showCohort') === 'on',
      showPositions: formData.get('showPositions') === 'on',
      showActivities: formData.get('showActivities') === 'on',
      showProjects: formData.get('showProjects') === 'on',
    })
    .where(eq(members.id, user.memberId));
  return { ok: true };
}

export async function sendInvolvementRequest(formData: FormData): Promise<ActionResult> {
  const user = await requireMember();
  const [type, id] = String(formData.get('target') ?? '').split(':');
  if ((type !== 'project' && type !== 'activity') || !uuid.safeParse(id).success) return { error: 'common.invalid' };
  const note = String(formData.get('note') ?? '').trim().slice(0, 500);
  const target = type === 'project' ? { projectId: id } : { activityId: id };

  const [published] =
    type === 'project'
      ? await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, id), eq(projects.isPublished, true)))
      : await db.select({ id: activities.id }).from(activities).where(and(eq(activities.id, id), eq(activities.isPublished, true)));
  if (!published) return { error: 'common.invalid' };

  const inserted = await db
    .insert(involvementRequests)
    .values({ memberId: user.memberId, note, ...target })
    .onConflictDoNothing()
    .returning();
  return inserted.length ? { ok: true } : { error: 'me.requestDuplicate' };
}

export async function decideRequest(requestId: string, approve: boolean, decisionNote: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(requestId);
  await db.transaction(async (tx) => {
    const [request] = await tx
      .update(involvementRequests)
      .set({
        status: approve ? 'approved' : 'rejected',
        decidedBy: user.accountId,
        decidedAt: new Date(),
        decisionNote: decisionNote.trim().slice(0, 500) || null,
      })
      .where(and(eq(involvementRequests.id, id), eq(involvementRequests.status, 'pending')))
      .returning();
    if (!request || !approve) return;
    if (request.projectId) {
      await tx.insert(projectMembers).values({ projectId: request.projectId, memberId: request.memberId }).onConflictDoNothing();
    } else if (request.activityId) {
      await tx.insert(activityMembers).values({ activityId: request.activityId, memberId: request.memberId }).onConflictDoNothing();
    }
  });
  await audit(user.accountId, approve ? 'request.approve' : 'request.reject', 'involvement_request', id);
  return { ok: true };
}

export async function createMember(formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const parsed = profile
    .extend({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/) })
    .safeParse({
      fullName: formData.get('fullName'),
      major: formData.get('major'),
      cohort: formData.get('cohort'),
      username: formData.get('username'),
    });
  if (!parsed.success) return { error: 'common.invalid' };
  const { username, ...data } = parsed.data;

  const [taken] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, username));
  if (taken) return { error: 'committee.usernameTaken' };

  const password = temporaryPassword();
  const passwordHash = await hashPassword(password);
  const slug = await uniqueMemberSlug(data.fullName);
  const [memberPosition] = await db.select({ id: positions.id }).from(positions).where(eq(positions.name, 'Member'));

  const memberId = await db.transaction(async (tx) => {
    const [account] = await tx.insert(accounts).values({ username, passwordHash, mustChangePassword: true }).returning();
    const [member] = await tx.insert(members).values({ ...data, slug, accountId: account.id }).returning();
    await tx.insert(memberPositions).values({
      memberId: member.id,
      positionId: memberPosition.id,
      startDate: monthStart(todayInJakarta().slice(0, 7)),
    });
    return member.id;
  });
  await audit(user.accountId, 'member.create', 'member', memberId, { fullName: data.fullName, username });
  return { ok: true, temporaryPassword: password };
}

export async function updateMemberProfile(memberId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(memberId);
  const parsed = profile.safeParse({ fullName: formData.get('fullName'), major: formData.get('major'), cohort: formData.get('cohort') });
  if (!parsed.success) return { error: 'common.invalid' };
  await db.update(members).set(parsed.data).where(eq(members.id, id));
  await audit(user.accountId, 'member.update', 'member', id, parsed.data);
  return { ok: true };
}

/** Offboarding memutus semua sesi; getCurrentUser juga memeriksa status di setiap request. */
export async function setMemberStatus(memberId: string, status: 'onboarded' | 'offboarded'): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(memberId);
  await db.transaction(async (tx) => {
    const [member] = await tx.update(members).set({ status: z.enum(['onboarded', 'offboarded']).parse(status) }).where(eq(members.id, id)).returning();
    if (member && status === 'offboarded') await tx.delete(sessions).where(eq(sessions.accountId, member.accountId));
  });
  await audit(user.accountId, `member.${status}`, 'member', id);
  return { ok: true };
}

export async function deleteMember(memberId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(memberId);
  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member || member.accountId === user.accountId) return { error: 'common.error' };
  await db.delete(accounts).where(eq(accounts.id, member.accountId));
  await audit(user.accountId, 'member.delete', 'member', id, { fullName: member.fullName });
  redirect('/committee/members');
}

export async function setMemberInvolvement(memberId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(memberId);
  const projectIds = z.array(uuid).parse(formData.getAll('projectIds'));
  const activityIds = z.array(uuid).parse(formData.getAll('activityIds'));
  await db.transaction(async (tx) => {
    await tx.delete(projectMembers).where(eq(projectMembers.memberId, id));
    await tx.delete(activityMembers).where(eq(activityMembers.memberId, id));
    if (projectIds.length) await tx.insert(projectMembers).values(projectIds.map((projectId) => ({ projectId, memberId: id })));
    if (activityIds.length) await tx.insert(activityMembers).values(activityIds.map((activityId) => ({ activityId, memberId: id })));
  });
  await audit(user.accountId, 'member.update_involvement', 'member', id, { projects: projectIds.length, activities: activityIds.length });
  return { ok: true };
}

async function parsePosition(formData: FormData) {
  const parsed = z
    .object({ positionId: uuid, start: month, end: z.union([month, z.literal('')]) })
    .safeParse({ positionId: formData.get('positionId'), start: formData.get('start'), end: formData.get('end') ?? '' });
  if (!parsed.success) return { error: 'common.invalid' };
  const { positionId, start, end } = parsed.data;
  if (end && end < start) return { error: 'committee.endBeforeStart' };
  const [position] = await db.select().from(positions).where(eq(positions.id, positionId));
  if (!position) return { error: 'common.invalid' };
  if (position.grantsCommittee && !end) return { error: 'committee.endRequired' };
  return { values: { positionId, startDate: monthStart(start), endDate: end ? monthEnd(end) : null } };
}

export async function addMemberPosition(memberId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(memberId);
  const result = await parsePosition(formData);
  if (!result.values) return { error: result.error };
  await db.insert(memberPositions).values({ ...result.values, memberId: id });
  await audit(user.accountId, 'member.add_position', 'member', id, result.values);
  return { ok: true };
}

export async function updateMemberPosition(entryId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(entryId);
  const result = await parsePosition(formData);
  if (!result.values) return { error: result.error };
  await db.update(memberPositions).set(result.values).where(eq(memberPositions.id, id));
  await audit(user.accountId, 'member.update_position', 'member_position', id, result.values);
  return { ok: true };
}

export async function deleteMemberPosition(entryId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(entryId);
  await db.delete(memberPositions).where(eq(memberPositions.id, id));
  await audit(user.accountId, 'member.delete_position', 'member_position', id);
  return { ok: true };
}

export async function createPosition(formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const name = z.string().trim().min(1).max(60).safeParse(formData.get('name'));
  if (!name.success) return { error: 'common.invalid' };
  // grantsCommittee sengaja tidak diterima dari form: posisi baru tidak memberi akses komite.
  const [created] = await db.insert(positions).values({ name: name.data }).onConflictDoNothing().returning();
  if (!created) return { error: 'committee.positionExists' };
  await audit(user.accountId, 'position.create', 'position', created.id, { name: name.data });
  return { ok: true };
}

export async function deletePosition(positionId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(positionId);
  const [position] = await db.select().from(positions).where(eq(positions.id, id));
  if (!position || position.isLocked) return { error: 'common.error' };
  const [{ n }] = await db.select({ n: count() }).from(memberPositions).where(eq(memberPositions.positionId, id));
  if (n > 0) return { error: 'committee.positionInUse' };
  await db.delete(positions).where(eq(positions.id, id));
  await audit(user.accountId, 'position.delete', 'position', id, { name: position.name });
  return { ok: true };
}

/** Akun seeder hanya boleh di-reset oleh akun seeder lain. */
export async function resetPassword(accountId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(accountId);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
  if (!account) return { error: 'common.error' };
  if (account.kind === 'system' && user.kind !== 'system') forbidden();
  const password = temporaryPassword();
  await db.update(accounts).set({ passwordHash: await hashPassword(password), mustChangePassword: true }).where(eq(accounts.id, id));
  await db.delete(sessions).where(eq(sessions.accountId, id));
  await audit(user.accountId, 'account.reset_password', 'account', id);
  return { ok: true, temporaryPassword: password };
}

export async function setAccountActive(accountId: string, isActive: boolean): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = uuid.parse(accountId);
  const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
  if (!account || account.kind === 'system') return { error: 'common.error' };
  await db.update(accounts).set({ isActive }).where(eq(accounts.id, id));
  if (!isActive) await db.delete(sessions).where(eq(sessions.accountId, id));
  await audit(user.accountId, isActive ? 'account.activate' : 'account.deactivate', 'account', id);
  return { ok: true };
}
