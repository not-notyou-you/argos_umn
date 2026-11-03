import { hash } from '@node-rs/argon2';
import { type Browser, type Page, expect, test } from '@playwright/test';
import postgres from 'postgres';

/** Aturan status project: open, on progress, done, cancelled, beserta timeline dan request-nya. */

const BASE = 'http://localhost:3100';
const sql = postgres(process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test', { max: 1, onnotice: () => {} });
const PASSWORD = 'status-password-yang-panjang';
let projectId = '';
let applicantId = '';
let outsiderId = '';

async function makeMember(username: string) {
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const [account] = await sql`insert into accounts (username, password_hash, must_change_password) values (${username}, ${passwordHash}, false) returning id`;
  const [member] = await sql`insert into members (account_id, slug, full_name) values (${account.id}, ${username.replace('.', '-')}, ${username}) returning id`;
  return member.id as string;
}

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

const statusOf = async () => (await sql`select status from projects where id = ${projectId}`)[0].status;

async function saveStatus(admin: Page, status: string) {
  await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
  await admin.locator('select[name="status"]').selectOption(status);
  await admin.getByRole('button', { name: 'Simpan' }).first().click();
}

test.beforeAll(async () => {
  await sql`delete from login_attempts`;
  await sql`delete from accounts where username like 'st.%'`;
  await sql`delete from projects where slug like 'st-%'`;
  await sql`delete from activities where slug like 'st-%'`;
  const adminHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await sql`update accounts set password_hash = ${adminHash}, must_change_password = false where kind = 'system'`;
  applicantId = await makeMember('st.applicant');
  outsiderId = await makeMember('st.outsider');
  const [project] = await sql`insert into projects (name, slug, status, is_published, published_at) values ('St Project', 'st-project', 'cancelled', true, now()) returning id`;
  projectId = project.id;
  await sql`insert into activities (name, slug, activity_date, is_published, published_at, registration_open, registration_url)
    values ('St Acara Buka', 'st-buka', '2026-12-01', true, now(), true, 'https://join.theiofoundation.org/st'),
           ('St Acara Tutup', 'st-tutup', '2026-12-02', true, now(), false, 'https://join.theiofoundation.org/tutup')`;
});

test.afterAll(() => sql.end());

test('project on progress lama tanpa timeline tetap bisa diubah anggotanya', async ({ browser }) => {
  const [legacy] = await sql`insert into projects (name, slug, status) values ('St Lama', 'st-lama', 'on_progress') returning id`;
  await sql`insert into project_members (project_id, member_id) values (${legacy.id}, ${applicantId})`;
  const admin = await session(browser, 'president');
  await admin.goto(`/committee/projects/${legacy.id}`, { waitUntil: 'networkidle' });
  await admin.getByLabel('st.outsider').check();
  await admin.getByRole('button', { name: 'Simpan' }).first().click();
  await expect(admin.getByText('Tersimpan.')).toBeVisible();
  expect((await sql`select count(*)::int n from project_members where project_id = ${legacy.id}`)[0].n).toBe(2);
});

test.describe.serial('alur status project', () => {
  test('open dan on progress ditolak tanpa timeline', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await saveStatus(admin, 'open');
    await expect(admin.getByText('wajib punya minimal satu tahap timeline')).toBeVisible();
    expect(await statusOf()).toBe('cancelled');
  });

  test('timeline terkunci saat cancelled, terbuka setelah status diubah', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await expect(admin.getByRole('button', { name: 'Tambah tahap' })).toHaveCount(0);

    // Membuka kunci tanpa syarat timeline/anggota hanya untuk menyiapkan data uji.
    await sql`update projects set status = 'on_progress' where id = ${projectId}`;
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    const form = admin.locator('form').filter({ has: admin.getByRole('button', { name: 'Tambah tahap' }) });
    await form.getByLabel('Judul tahap').fill('Riset awal');
    await form.getByLabel('Deskripsi').fill('deskripsi-rahasia-tahap');
    await form.getByLabel('Mulai').fill('2026-01-01');
    await form.getByLabel('Selesai').fill('2026-02-01');
    await form.getByRole('button', { name: 'Tambah tahap' }).click();
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    expect((await sql`select count(*)::int n from project_timeline_items where project_id = ${projectId}`)[0].n).toBe(1);
  });

  test('on progress ditolak tanpa anggota', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await saveStatus(admin, 'on_progress');
    await expect(admin.getByText('wajib punya minimal satu anggota')).toBeVisible();
  });

  test('member mendaftar ke project open, komite menerima', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await saveStatus(admin, 'open');
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    expect(await statusOf()).toBe('open');

    const member = await session(browser, 'st.applicant');
    await member.goto('/me/information', { waitUntil: 'networkidle' });
    await expect(member.getByRole('link', { name: /Buka formulir pendaftaran/ })).toHaveCount(1);
    await expect(member.getByText('St Acara Tutup')).toHaveCount(0);
    await member.getByTestId(`register-${projectId}`).getByRole('button', { name: 'Daftar' }).click();
    await expect(member.getByText('Tersimpan.')).toBeVisible();

    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await admin.getByRole('button', { name: 'Setujui' }).first().click();
    await expect.poll(async () => (await sql`select count(*)::int n from project_members where project_id = ${projectId} and member_id = ${applicantId}`)[0].n).toBe(1);
  });

  test('anggota mengajukan perubahan timeline, komite menyetujui', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await saveStatus(admin, 'on_progress');
    await expect(admin.getByText('Tersimpan.')).toBeVisible();

    const member = await session(browser, 'st.applicant');
    await member.goto(`/me/projects/${projectId}`, { waitUntil: 'networkidle' });
    await member.getByLabel('Tautan bukti (Drive, GitHub, dll.)').fill('https://github.com/contoh/bukti');
    await member.getByRole('button', { name: 'Kirim pengajuan' }).click();
    await expect(member.getByText('Tersimpan.')).toBeVisible();

    await admin.goto('/committee/requests?tab=timeline', { waitUntil: 'networkidle' });
    await expect(admin.getByText('https://github.com/contoh/bukti')).toBeVisible();
    const [request] = await sql`select r.id from timeline_requests r join project_timeline_items i on i.id = r.item_id where i.project_id = ${projectId} and r.status = 'pending'`;
    await admin.getByTestId(`timeline-request-${request.id}`).getByRole('button', { name: 'Setujui' }).click();
    await expect.poll(async () => (await sql`select status from project_timeline_items where project_id = ${projectId}`)[0].status).toBe('done');
  });

  test('non-anggota tidak bisa mengakses halaman pengajuan', async ({ browser }) => {
    const outsider = await session(browser, 'st.outsider');
    await outsider.goto(`/me/projects/${projectId}`, { waitUntil: 'networkidle' });
    await expect(outsider.getByRole('button', { name: 'Kirim pengajuan' })).toHaveCount(0);
    await expect(outsider.getByText('Riset awal')).toHaveCount(0);
    expect((await sql`select count(*)::int n from timeline_requests where member_id = ${outsiderId}`)[0].n).toBe(0);
  });

  test('publik melihat timeline tanpa deskripsi', async ({ page }) => {
    await page.goto('/projects/st-project', { waitUntil: 'networkidle' });
    await expect(page.getByText('Riset awal')).toBeVisible();
    await expect(page.getByText('deskripsi-rahasia-tahap')).toHaveCount(0);
  });

  test('done mengunci anggota dan timeline, reopen membukanya', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await saveStatus(admin, 'done');
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await expect(admin.getByRole('button', { name: 'Tambah tahap' })).toHaveCount(0);

    // Ganti ke cancelled: anggota tetap utuh walau form tidak mengirim checklist.
    await saveStatus(admin, 'cancelled');
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    expect((await sql`select count(*)::int n from project_members where project_id = ${projectId}`)[0].n).toBe(1);

    await saveStatus(admin, 'on_progress');
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    expect((await sql`select count(*)::int n from project_members where project_id = ${projectId}`)[0].n).toBe(1);
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await expect(admin.getByRole('button', { name: 'Tambah tahap' })).toHaveCount(1);
  });
});
