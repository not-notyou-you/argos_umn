import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { accounts, auditLogs, sessions } from './schema';

const username = process.argv[2];
if (!username) {
  console.error('Pemakaian: npm run account:reset -- <username>');
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const db = drizzle(client);

const [account] = await db.select().from(accounts).where(eq(accounts.username, username));
if (!account) {
  console.error(`Akun tidak ditemukan: ${username}`);
  await client.end();
  process.exit(1);
}

const password = randomBytes(12).toString('base64url');
await db
  .update(accounts)
  .set({
    passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    mustChangePassword: true,
  })
  .where(eq(accounts.id, account.id));
await db.delete(sessions).where(eq(sessions.accountId, account.id));
await db.insert(auditLogs).values({ action: 'account.reset_cli', entityType: 'account', entityId: account.id });

console.log(`Password sementara untuk ${username}: ${password}`);
await client.end();
