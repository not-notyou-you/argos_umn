import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { forbidden, redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { accounts, memberPositions, members, positions, projectMembers, sessions } from '@/db/schema';
import { canAccessCommittee, canLogin, todayInJakarta } from './access';

const COOKIE = 'argos_session';
const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 86_400_000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(accountId: string) {
  const token = randomBytes(32).toString('base64url');
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    accountId,
    expiresAt: new Date(Date.now() + SESSION_MS),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.PUBLIC_BASE_URL?.startsWith('https://') ?? false,
    path: '/',
    maxAge: 30 * 86_400,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  store.delete(COOKIE);
}

export type CurrentUser = {
  accountId: string;
  username: string;
  kind: 'system' | 'member';
  mustChangePassword: boolean;
  memberId: string | null;
  memberSlug: string | null;
  isCommittee: boolean;
};

/**
 * Status dan posisi selalu dibaca dari database, sehingga offboarding dan
 * akhir masa jabatan berlaku tanpa menunggu sesi berakhir.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);

  const [row] = await db
    .select({ account: accounts, member: members, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .leftJoin(members, eq(members.accountId, accounts.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())));
  if (!row) return null;

  const access = { kind: row.account.kind, isActive: row.account.isActive, memberStatus: row.member?.status ?? null };
  if (!canLogin(access)) {
    await db.delete(sessions).where(eq(sessions.accountId, row.account.id));
    return null;
  }

  if (row.expiresAt.getTime() - Date.now() < SESSION_MS / 2) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_MS), lastSeenAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  }

  const held = row.member
    ? await db
        .select({
          grantsCommittee: positions.grantsCommittee,
          startDate: memberPositions.startDate,
          endDate: memberPositions.endDate,
        })
        .from(memberPositions)
        .innerJoin(positions, eq(positions.id, memberPositions.positionId))
        .where(eq(memberPositions.memberId, row.member.id))
    : [];

  return {
    accountId: row.account.id,
    username: row.account.username,
    kind: row.account.kind,
    mustChangePassword: row.account.mustChangePassword,
    memberId: row.member?.id ?? null,
    memberSlug: row.member?.slug ?? null,
    isCommittee: canAccessCommittee(access, held, todayInJakarta()),
  };
});

export async function requireAccount({ allowTemporaryPassword = false } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.mustChangePassword && !allowTemporaryPassword) redirect('/account/password');
  return user;
}

export async function requireMember() {
  const user = await requireAccount();
  if (!user.memberId) redirect('/committee');
  return user as CurrentUser & { memberId: string };
}

export async function requireCommittee() {
  const user = await requireAccount();
  if (!user.isCommittee) forbidden();
  return user;
}

export async function isProjectMember(user: CurrentUser, projectId: string) {
  if (!user.memberId) return false;
  const [row] = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, user.memberId)));
  return Boolean(row);
}

/** Komite atau anggota project; dipakai untuk edit konten project. */
export async function requireProjectEditor(projectId: string) {
  const user = await requireAccount();
  if (!user.isCommittee && !(await isProjectMember(user, projectId))) forbidden();
  return user;
}
