'use server';

import { and, count, eq, gt, lt } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { accounts, loginAttempts, members, sessions } from '@/db/schema';
import { isLocale } from '@/i18n/config';
import { canLogin } from '@/lib/access';
import { createSession, destroySession, requireAccount } from '@/lib/auth';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/password';
import { safeLocalPath } from '@/lib/util';
import type { ActionResult } from './types';

const WINDOW_MS = 15 * 60 * 1000;
/** Per pasangan username dan IP, agar penyerang tidak mudah mengunci akun orang lain. */
const MAX_PER_PAIR = 5;
/** Batas keras per username, untuk tebakan dari banyak IP. */
const MAX_PER_USERNAME = 20;
const MAX_PER_IP = 30;
const MAX_PASSWORD_LENGTH = 256;

let dummyHash: Promise<string> | undefined;

async function clientIp() {
  const h = await headers();
  // CF-Connecting-IP ditulis Cloudflare, sedangkan X-Forwarded-For bisa dikirim klien.
  return h.get('cf-connecting-ip') || h.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}

export async function loginAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const username = String(formData.get('username') ?? '').trim().toLowerCase().slice(0, 64);
  const password = String(formData.get('password') ?? '');
  const ip = await clientIp();
  const since = new Date(Date.now() - WINDOW_MS);

  const failures = (filter: ReturnType<typeof eq>) =>
    db.select({ n: count() }).from(loginAttempts).where(and(filter, eq(loginAttempts.succeeded, false), gt(loginAttempts.attemptedAt, since)));
  const [[byPair], [byUser], [byIp]] = await Promise.all([
    failures(and(eq(loginAttempts.username, username), eq(loginAttempts.ip, ip))!),
    failures(eq(loginAttempts.username, username)),
    failures(eq(loginAttempts.ip, ip)),
  ]);
  if (byPair.n >= MAX_PER_PAIR || byUser.n >= MAX_PER_USERNAME || byIp.n >= MAX_PER_IP) return { error: 'auth.limited' };

  const [row] = await db
    .select({ account: accounts, status: members.status })
    .from(accounts)
    .leftJoin(members, eq(members.accountId, accounts.id))
    .where(eq(accounts.username, username));

  dummyHash ??= hashPassword('tidak-ada-akun-ini');
  const valid = password.length <= MAX_PASSWORD_LENGTH && (await verifyPassword(row?.account.passwordHash ?? (await dummyHash), password));
  await db.insert(loginAttempts).values({ username, ip, succeeded: Boolean(row && valid) });
  if (!row || !valid) return { error: 'auth.failed' };
  await db.delete(loginAttempts).where(lt(loginAttempts.attemptedAt, new Date(Date.now() - 86_400_000)));

  if (!canLogin({ kind: row.account.kind, isActive: row.account.isActive, memberStatus: row.status })) {
    return { error: 'auth.offboarded' };
  }

  await createSession(row.account.id);
  await db.update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, row.account.id));
  redirect(row.account.mustChangePassword ? '/account/password' : row.account.kind === 'system' ? '/committee' : '/me/profile');
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function setLocaleAction(formData: FormData) {
  const locale = formData.get('locale');
  const path = safeLocalPath(String(formData.get('path') ?? '/'));
  if (!isLocale(locale)) redirect(path);

  (await cookies()).set('NEXT_LOCALE', locale, { path: '/', sameSite: 'lax', maxAge: 365 * 86_400 });

  const bare = path.replace(/^\/en(?=\/|\?|$)/, '') || '/';
  const isPublic = !/^\/(login|me|committee|account)(\/|\?|$)/.test(bare);
  redirect(isPublic && locale === 'en' ? `/en${bare === '/' ? '' : bare}` : bare);
}

export async function changePasswordAction(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireAccount({ allowTemporaryPassword: true });
  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('new') ?? '');
  if (next !== formData.get('confirm')) return { error: 'auth.mismatch' };
  const problem = passwordProblem(next);
  if (problem) return { error: `auth.${problem}` };

  const [account] = await db.select().from(accounts).where(eq(accounts.id, user.accountId));
  if (next.length > MAX_PASSWORD_LENGTH) return { error: 'auth.tooLong' };
  if (!(await verifyPassword(account.passwordHash, current))) return { error: 'auth.wrongCurrent' };
  if (next === current) return { error: 'auth.samePassword' };

  await db.update(accounts).set({ passwordHash: await hashPassword(next), mustChangePassword: false }).where(eq(accounts.id, account.id));
  await db.delete(sessions).where(eq(sessions.accountId, account.id));
  await createSession(account.id);
  redirect(user.memberId ? '/me/profile' : '/committee');
}
