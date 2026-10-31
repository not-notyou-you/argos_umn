import { execSync } from 'node:child_process';
import postgres from 'postgres';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test';

export default async function setup() {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql`drop schema public cascade`;
  await sql`create schema public`;
  await sql`drop schema if exists drizzle cascade`;
  await sql.end();

  const env = {
    ...process.env,
    DATABASE_URL: url,
    SEED_PRESIDENT_PASSWORD: 'seed-president-test',
    SEED_VICE_PRESIDENT_PASSWORD: 'seed-vice-test-pass',
    SEED_SECRETARY_1_PASSWORD: 'seed-secretary1-test',
    SEED_SECRETARY_2_PASSWORD: 'seed-secretary2-test',
  };
  execSync('npm run db:migrate', { env, stdio: 'inherit' });
  execSync('npm run db:seed', { env, stdio: 'inherit' });
}
