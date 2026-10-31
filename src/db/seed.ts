import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DEFAULT_ABOUT } from '../lib/about-defaults';
import { accounts, positions, siteContent } from './schema';

const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const db = drizzle(client);

const SYSTEM_ACCOUNTS = [
  { username: 'president', role: 'president', env: 'SEED_PRESIDENT_PASSWORD' },
  { username: 'vice-president', role: 'vice_president', env: 'SEED_VICE_PRESIDENT_PASSWORD' },
  { username: 'secretary-1', role: 'secretary', env: 'SEED_SECRETARY_1_PASSWORD' },
  { username: 'secretary-2', role: 'secretary', env: 'SEED_SECRETARY_2_PASSWORD' },
] as const;

const POSITIONS = [
  { name: 'President', grantsCommittee: true, sortOrder: 1 },
  { name: 'Vice President', grantsCommittee: true, sortOrder: 2 },
  { name: 'Secretary', grantsCommittee: true, sortOrder: 3 },
  { name: 'Treasurer', grantsCommittee: false, sortOrder: 4 },
  { name: 'IT Admin', grantsCommittee: false, sortOrder: 5 },
  { name: 'Comms', grantsCommittee: false, sortOrder: 6 },
  { name: 'Member', grantsCommittee: false, sortOrder: 7 },
];

for (const account of SYSTEM_ACCOUNTS) {
  const [existing] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, account.username));
  if (existing) continue;

  const password = process.env[account.env];
  if (!password || password.length < 12) throw new Error(`${account.env} wajib diisi, minimal 12 karakter.`);

  await db.insert(accounts).values({
    username: account.username,
    passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    mustChangePassword: true,
    kind: 'system',
    systemRole: account.role,
  });
  console.log(`Akun seeder dibuat: ${account.username}`);
}

await db
  .insert(positions)
  .values(POSITIONS.map((p) => ({ ...p, isLocked: true })))
  .onConflictDoNothing();

await db.insert(siteContent).values({ key: 'about', value: DEFAULT_ABOUT }).onConflictDoNothing();

await client.end();
console.log('Seed selesai.');
