import { hash } from '@node-rs/argon2';
import { type Browser, type Page, expect, test } from '@playwright/test';
import postgres from 'postgres';

/** Usulan project dari member: diterima menjadi project open, atau ditolak dengan feedback wajib. */

const BASE = 'http://localhost:3100';
const sql = postgres(process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test', { max: 1, onnotice: () => {} });
const PASSWORD = 'usulan-password-yang-panjang';
let proposerId = '';

async function session(browser: Browser, username: string): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).not.toHaveURL(/login/);
  await page.waitForLoadState('networkidle');
  return page;
}

async function fillProposal(page: Page, name: string, stages: [string, string, string][]) {
  await page.goto('/me/proposals', { waitUntil: 'networkidle' });
  await page.getByLabel('Judul project').fill(name);
  await page.getByLabel('Deskripsi', { exact: true }).first().fill(`Deskripsi ${name}`);
  for (const [i, [title, start, end]] of stages.entries()) {
    if (i > 0) await page.getByRole('button', { name: 'Tambah tahap' }).click();
    await page.getByLabel('Judul tahap').nth(i).fill(title);
    await page.getByLabel('Mulai').nth(i).fill(start);
    await page.getByLabel('Selesai').nth(i).fill(end);
  }
  await page.getByRole('button', { name: 'Kirim usulan' }).click();
}

const proposal = async (name: string) => (await sql`select * from project_proposals where name = ${name}`)[0];

test.beforeAll(async () => {
  await sql`delete from login_attempts`;
  await sql`delete from accounts where username like 'pr.%'`;
  await sql`delete from projects where name like 'Usulan Uji%'`;
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await sql`update accounts set password_hash = ${passwordHash}, must_change_password = false where kind = 'system'`;
  const [account] = await sql`insert into accounts (username, password_hash, must_change_password) values ('pr.pengusul', ${passwordHash}, false) returning id`;
  const [member] = await sql`insert into members (account_id, slug, full_name) values (${account.id}, 'pr-pengusul', 'Pengusul Uji') returning id`;
  proposerId = member.id;
});

test.afterAll(() => sql.end());

test.describe.serial('usulan project', () => {
  test('usulan tanpa tahap yang valid ditolak server', async ({ browser }) => {
    const member = await session(browser, 'pr.pengusul');
    await fillProposal(member, 'Usulan Uji Salah', [['Tahap terbalik', '2026-12-31', '2026-12-01']]);
    await expect(member.getByText('Timeline wajib minimal satu tahap')).toBeVisible();
    expect(await proposal('Usulan Uji Salah')).toBeUndefined();
  });

  test('member mengirim dua usulan', async ({ browser }) => {
    const member = await session(browser, 'pr.pengusul');
    await fillProposal(member, 'Usulan Uji Ditolak', [['Riset', '2026-12-01', '2026-12-15']]);
    await expect(member.getByText('Tersimpan.')).toBeVisible();
    await fillProposal(member, 'Usulan Uji Diterima', [['Riset', '2026-12-01', '2026-12-15'], ['Implementasi', '2026-12-16', '2027-01-31']]);
    await expect(member.getByText('Tersimpan.')).toBeVisible();
    expect((await proposal('Usulan Uji Diterima')).timeline).toHaveLength(2);
  });

  test('penolakan tanpa feedback tidak bisa, dengan feedback terlihat oleh pengusul', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto('/committee/requests?tab=proposals', { waitUntil: 'networkidle' });
    const card = admin.getByTestId(`proposal-${(await proposal('Usulan Uji Ditolak')).id}`);
    await expect(card.getByRole('button', { name: 'Tolak' })).toBeDisabled();
    await card.getByPlaceholder('Feedback (wajib jika menolak)').fill('Ruang lingkup terlalu luas untuk satu semester.');
    await card.getByRole('button', { name: 'Tolak' }).click();
    await expect.poll(async () => (await proposal('Usulan Uji Ditolak')).status).toBe('rejected');

    const member = await session(browser, 'pr.pengusul');
    await member.goto('/me/proposals', { waitUntil: 'networkidle' });
    await expect(member.getByText('Ruang lingkup terlalu luas untuk satu semester.')).toBeVisible();
  });

  test('database menolak penolakan tanpa feedback', async () => {
    const row = await proposal('Usulan Uji Diterima');
    await expect(sql`update project_proposals set status = 'rejected', decision_note = '  ' where id = ${row.id}`).rejects.toThrow(/proposal_reject_feedback/);
  });

  test('usulan diterima menjadi project open dengan pengusul sebagai anggota', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto('/committee/requests?tab=proposals', { waitUntil: 'networkidle' });
    const card = admin.getByTestId(`proposal-${(await proposal('Usulan Uji Diterima')).id}`);
    await card.getByRole('button', { name: 'Setujui' }).click();
    await expect.poll(async () => (await proposal('Usulan Uji Diterima')).status).toBe('approved');

    const { project_id: projectId } = await proposal('Usulan Uji Diterima');
    const [project] = await sql`select status, is_published from projects where id = ${projectId}`;
    expect(project).toMatchObject({ status: 'open', is_published: true });
    expect((await sql`select count(*)::int n from project_timeline_items where project_id = ${projectId}`)[0].n).toBe(2);
    expect((await sql`select member_id from project_members where project_id = ${projectId}`).map((r) => r.member_id)).toEqual([proposerId]);

    const member = await session(browser, 'pr.pengusul');
    await member.goto('/me/information', { waitUntil: 'networkidle' });
    await expect(member.getByRole('heading', { name: 'Usulan Uji Diterima' })).toBeVisible();
    await expect(member.getByText('Anda sudah menjadi anggota')).toBeVisible();
  });
});
