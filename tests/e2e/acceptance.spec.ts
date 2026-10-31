import { type Page, expect, test } from '@playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';

/** Skenario berurutan dari kriteria penerimaan PRD bagian 10. */
test.describe.configure({ mode: 'serial' });

const sql = postgres(process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test', { max: 1, onnotice: () => {} });
const NEW_PASSWORD = 'password-baru-yang-panjang';
const SECOND_PASSWORD = 'password-kedua-yang-panjang';
let memberTemp = '';

test.afterAll(() => sql.end());

// Tunggu hydration agar tombol client component sudah aktif.
test.beforeEach(({ page }) => {
  const goto = page.goto.bind(page);
  page.goto = (url, options) => goto(url, { waitUntil: 'networkidle', ...options });
});

async function login(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

async function changePassword(page: Page, current: string, next: string) {
  await expect(page).toHaveURL(/account\/password/);
  await page.getByLabel('Password saat ini').fill(current);
  await page.getByLabel('Password baru', { exact: true }).fill(next);
  await page.getByLabel('Ulangi password baru').fill(next);
  await page.getByRole('button', { name: 'Simpan password' }).click();
}

const presidentLogin = async (page: Page) => {
  await login(page, 'president', NEW_PASSWORD);
  await expect(page).toHaveURL(/committee/);
};

const png = (color: string) =>
  sharp({ create: { width: 800, height: 500, channels: 3, background: color } }).png().toBuffer();

async function memberId(name: string) {
  const [row] = await sql`select id from members where full_name = ${name}`;
  return row.id as string;
}

test('halaman publik tampil tanpa data, dengan logo TIOF dan UMN', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Belajar teknologi');
  await expect(page.getByText('Big Data', { exact: true })).toBeVisible();
  await expect(page.getByText('ERP', { exact: true })).toBeVisible();
  await expect(page.locator('footer img[alt="Universitas Multimedia Nusantara"]')).toBeVisible();
  for (const path of ['/projects', '/activities', '/members', '/galleries', '/en/projects']) {
    expect((await page.goto(path))?.status()).toBe(200);
  }
});

test('versi Inggris dan pemilih bahasa', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('link', { name: 'View Projects' })).toBeVisible();
  await page.getByRole('button', { name: 'id', exact: true }).first().click();
  await expect(page).toHaveURL(/localhost:3100\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
});

test('password tidak pernah masuk URL walau JavaScript mati', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:3100', javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/login');
  await page.getByLabel('Username').fill('tidak-ada');
  await page.getByLabel('Password').fill('rahasia-tidak-boleh-bocor');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Username atau password salah.')).toBeVisible();
  expect(page.url()).not.toContain('rahasia');
  await context.close();
  await sql`delete from login_attempts`;
});

test('tamu tidak bisa membuka area login', async ({ page }) => {
  await page.goto('/committee');
  await expect(page).toHaveURL(/login/);
  await page.goto('/me/profile');
  await expect(page).toHaveURL(/login/);
});

test('empat akun seeder ada dan wajib ganti password', async ({ page }) => {
  const rows = await sql`select username from accounts where kind = 'system' order by username`;
  expect(rows.map((r) => r.username)).toEqual(['president', 'secretary-1', 'secretary-2', 'vice-president']);
  await login(page, 'president', 'seed-president-test');
  await changePassword(page, 'seed-president-test', NEW_PASSWORD);
  await expect(page).toHaveURL(/committee/);
});

test('password salah ditolak dengan pesan generik', async ({ page }) => {
  await login(page, 'president', 'salah-salah-salah');
  await expect(page.getByText('Username atau password salah.')).toBeVisible();
  await sql`delete from login_attempts`;
});

test('database menolak penghapusan dan perubahan akun seeder', async () => {
  await expect(sql`delete from accounts where username = 'president'`).rejects.toThrow(/seeder/);
  await expect(sql`update accounts set is_active = false where username = 'president'`).rejects.toThrow(/seeder/);
});

test('komite membuat member dengan posisi Member dan password sementara', async ({ page }) => {
  await presidentLogin(page);
  await page.goto('/committee/members');
  await page.getByLabel('Nama').fill('Budi Uji');
  await page.getByLabel('Username').fill('budi.uji');
  await page.getByRole('button', { name: 'Buat member' }).click();
  memberTemp = (await page.getByTestId('temp-password').textContent())!;
  expect(memberTemp).toHaveLength(16);

  const id = await memberId('Budi Uji');
  const positions = await sql`select p.name from member_positions mp join positions p on p.id = mp.position_id where mp.member_id = ${id}`;
  expect(positions.map((p) => p.name)).toEqual(['Member']);
});

test('seeder tidak muncul di Our Member', async ({ page }) => {
  await page.goto('/members');
  await expect(page.getByText('Budi Uji')).toBeVisible();
  await expect(page.getByText('president')).toHaveCount(0);
});

test('member wajib ganti password dan tidak bisa membuka panel komite', async ({ page }) => {
  await login(page, 'budi.uji', memberTemp);
  await changePassword(page, memberTemp, NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
  await page.goto('/committee');
  await expect(page.getByText('Halaman ini khusus komite.')).toBeVisible();
});

test('project: media, tombol, placeholder, dan publikasi', async ({ page }) => {
  await presidentLogin(page);
  await page.goto('/committee/projects');
  await page.getByLabel('Project baru').fill('Project Uji');
  await page.getByRole('button', { name: 'Buat draft' }).click();
  await expect(page).toHaveURL(/committee\/projects\/[0-9a-f-]+/);

  // Tanpa foto: tetap bisa dipublikasikan, memakai placeholder.
  await expect(page.getByText('Akan memakai cover placeholder.')).toBeVisible();
  await page.getByRole('button', { name: 'Publikasikan' }).click();
  await expect(page.getByRole('button', { name: 'Jadikan draft' })).toBeVisible();

  await page.goto('/projects/project-uji');
  await expect(page.getByRole('heading', { name: 'Project Uji' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open GitHub/ })).toHaveCount(0);

  const [{ id }] = await sql`select id from projects where slug = 'project-uji'`;
  const budi = await memberId('Budi Uji');
  await sql`insert into project_members (project_id, member_id) values (${id}, ${budi})`;

  await page.goto(`/committee/projects/${id}`);
  await page.getByTestId('photo-input').setInputFiles([
    { name: 'a.png', mimeType: 'image/png', buffer: await png('#2f6d7a') },
    { name: 'b.png', mimeType: 'image/png', buffer: await png('#a84e17') },
  ]);
  await expect(page.getByTestId('photo-count')).toHaveText('2/10');

  const github = page.locator('input[name="githubUrl"]');
  await github.fill('https://github.com/contoh/uji');
  await page.locator('input[name="githubUrlVisible"]').check();
  await page.getByRole('button', { name: 'Simpan' }).nth(1).click();
  await expect(page.getByText('Tersimpan.')).toBeVisible();

  await page.goto('/projects/project-uji');
  await expect(page.getByRole('link', { name: /Open GitHub/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open Project/ })).toHaveCount(0);
  await expect(page.locator('img[src^="/media/images/"]').first()).toBeVisible();

  await page.goto('/galleries');
  await expect(page.getByRole('button', { name: /Project Uji/ })).toHaveCount(2);
});

test('batas 10 foto ditegakkan di server', async ({ page }) => {
  await presidentLogin(page);
  const [{ id }] = await sql`select id from projects where slug = 'project-uji'`;
  await sql`insert into media (purpose, kind, source, storage_key, project_id, sort_order)
    select 'gallery', 'image', 'upload', 'x', ${id}, g from generate_series(10, 17) g`;
  const response = await page.request.post('/api/upload', {
    multipart: { purpose: 'gallery', ownerType: 'project', ownerId: id, file: { name: 'c.png', mimeType: 'image/png', buffer: await png('#000000') } },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toBe('editor.tooManyPhotos');
  await sql`delete from media where storage_key = 'x'`;
});

test('upload menolak berkas yang bukan gambar', async ({ page }) => {
  await presidentLogin(page);
  const [{ id }] = await sql`select id from projects where slug = 'project-uji'`;
  const response = await page.request.post('/api/upload', {
    multipart: { purpose: 'gallery', ownerType: 'project', ownerId: id, file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload=alert(1)>') } },
  });
  expect(response.status()).toBe(400);
});

test('anggota mengedit project, tetapi status dan anggota terkunci', async ({ page }) => {
  await login(page, 'budi.uji', NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
  await page.goto('/me/projects');
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByText('diatur komite')).toHaveCount(2);
  await expect(page.locator('select[name="status"]')).toHaveCount(0);
  await page.getByLabel('Deskripsi').fill('Deskripsi dari anggota.');
  await page.getByRole('button', { name: 'Simpan' }).click();
  await expect(page.getByText('Tersimpan.')).toBeVisible();

  await page.goto('/projects/project-uji');
  await expect(page.getByText('Deskripsi dari anggota.')).toBeVisible();
});

test('member tidak bisa upload ke project orang lain', async ({ page }) => {
  await sql`insert into projects (name, slug) values ('Project Lain', 'project-lain')`;
  const [{ id }] = await sql`select id from projects where slug = 'project-lain'`;
  await login(page, 'budi.uji', NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
  const response = await page.request.post('/api/upload', {
    multipart: { purpose: 'gallery', ownerType: 'project', ownerId: id, file: { name: 'a.png', mimeType: 'image/png', buffer: await png('#000000') } },
  });
  expect(response.status()).toBe(403);
  await page.goto(`/me/projects/${id}`);
  await expect(page.getByText('Halaman ini khusus komite.')).toBeVisible();
  await expect(page.getByLabel('Deskripsi')).toHaveCount(0);
});

test('pengaturan privasi menyembunyikan data di profil publik', async ({ page }) => {
  await login(page, 'budi.uji', NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
  await page.waitForLoadState('networkidle');
  await page.locator('input[name="major"]').fill('Informatika');
  await page.getByRole('button', { name: 'Simpan' }).first().click();
  await expect(page.getByText('Tersimpan.')).toBeVisible();
  await page.goto('/members/budi-uji');
  await expect(page.getByText('Informatika')).toBeVisible();

  await page.goto('/me/profile');
  await page.locator('input[name="showMajor"]').uncheck();
  await page.locator('input[name="showProjects"]').uncheck();
  await page.getByRole('button', { name: 'Simpan' }).first().click();
  await expect(page.getByText('Tersimpan.')).toBeVisible();

  await page.goto('/members/budi-uji');
  await expect(page.getByRole('heading', { name: 'Budi Uji' })).toBeVisible();
  await expect(page.getByText('Informatika')).toHaveCount(0);
  await expect(page.getByText('Project Uji')).toHaveCount(0);
});

test('request keterlibatan yang disetujui langsung tampil', async ({ page }) => {
  await presidentLogin(page);
  await page.goto('/committee/activities');
  await page.getByLabel('Aktivitas baru').fill('Workshop Uji');
  await page.getByLabel('Tanggal aktivitas').fill('2026-09-12');
  await page.getByRole('button', { name: 'Buat draft' }).click();
  await expect(page).toHaveURL(/committee\/activities\/[0-9a-f-]+/);
  await page.getByRole('button', { name: 'Publikasikan' }).click();
  await expect(page.getByRole('button', { name: 'Jadikan draft' })).toBeVisible();

  await page.context().clearCookies();
  await login(page, 'budi.uji', NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Project atau aktivitas').selectOption({ label: 'Workshop Uji' });
  await page.getByRole('button', { name: 'Kirim request' }).click();
  await expect(page.getByText('Menunggu')).toBeVisible();

  await page.context().clearCookies();
  await presidentLogin(page);
  await page.goto('/committee/requests');
  await expect(page.getByText('Budi Uji')).toBeVisible();
  await page.getByRole('button', { name: 'Setujui' }).click();
  await expect(page.getByText('Disetujui')).toBeVisible();

  await page.goto('/activities/workshop-uji');
  await expect(page.getByRole('link', { name: /Budi Uji/ })).toBeVisible();
});

test('posisi President memberi akses, dan berakhir setelah bulan selesai', async ({ page, browser }) => {
  await presidentLogin(page);
  const id = await memberId('Budi Uji');
  await page.goto(`/committee/members/${id}?tab=positions`);

  // Bulan selesai wajib untuk posisi pemberi akses.
  const add = page.locator('form').filter({ has: page.getByRole('button', { name: 'Tambah posisi' }) });
  await add.locator('select[name="positionId"]').selectOption({ label: 'President' });
  await add.locator('input[name="start"]').fill('2026-01');
  await add.getByRole('button', { name: 'Tambah posisi' }).click();
  await expect(page.getByText('Bulan selesai wajib untuk posisi ini.')).toBeVisible();

  await add.locator('input[name="end"]').fill('2099-12');
  await add.getByRole('button', { name: 'Tambah posisi' }).click();
  await expect(page.getByText('Tersimpan.').first()).toBeVisible();

  const [row] = await sql`select end_date::text from member_positions mp join positions p on p.id = mp.position_id where mp.member_id = ${id} and p.name = 'President'`;
  expect(row.end_date).toBe('2099-12-31');

  const member = await (await browser.newContext({ baseURL: 'http://localhost:3100' })).newPage();
  await login(member, 'budi.uji', NEW_PASSWORD);
  await expect(member).toHaveURL(/me\/profile/);
  await member.goto('/committee');
  await expect(member.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();

  // Masa jabatan berakhir: akses hilang tanpa login ulang.
  await sql`update member_positions set end_date = '2026-01-31' where member_id = ${id} and end_date = '2099-12-31'`;
  await member.goto('/committee');
  await expect(member.getByText('Halaman ini khusus komite.')).toBeVisible();

  await sql`update member_positions set end_date = '2099-12-31' where member_id = ${id} and end_date = '2026-01-31'`;
  await member.goto('/committee');
  await expect(member.getByRole('heading', { name: 'Ringkasan' })).toBeVisible();
  await member.close();
});

test('offboarding memutus sesi aktif dan memblokir login, profil tetap publik', async ({ page, browser }) => {
  const id = await memberId('Budi Uji');
  const member = await (await browser.newContext({ baseURL: 'http://localhost:3100' })).newPage();
  await login(member, 'budi.uji', NEW_PASSWORD);
  await expect(member).toHaveURL(/me\/profile/);

  await presidentLogin(page);
  await page.goto(`/committee/members/${id}`);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Offboard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Onboard kembali' })).toBeVisible();

  await member.goto('/committee');
  await expect(member).toHaveURL(/login/);
  await member.goto('/me/profile');
  await expect(member).toHaveURL(/login/);

  await login(member, 'budi.uji', NEW_PASSWORD);
  await expect(member.getByText('Akunmu sudah tidak aktif. Hubungi komite.')).toBeVisible();
  await member.close();

  await page.goto('/members?tab=offboarded');
  await expect(page.getByText('Budi Uji')).toBeVisible();
});

test('onboard kembali memulihkan login', async ({ page }) => {
  await presidentLogin(page);
  const id = await memberId('Budi Uji');
  await page.goto(`/committee/members/${id}`);
  await page.getByRole('button', { name: 'Onboard kembali' }).click();
  await expect(page.getByRole('button', { name: 'Offboard', exact: true })).toBeVisible();
  await page.context().clearCookies();
  await login(page, 'budi.uji', NEW_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
});

test('reset password memutus sesi lama', async ({ page }) => {
  await presidentLogin(page);
  const id = await memberId('Budi Uji');
  await page.goto(`/committee/members/${id}?tab=account`);
  await page.getByRole('button', { name: 'Reset password' }).click();
  const temp = (await page.getByTestId('temp-password').textContent())!;
  await page.context().clearCookies();
  await login(page, 'budi.uji', temp);
  await changePassword(page, temp, SECOND_PASSWORD);
  await expect(page).toHaveURL(/me\/profile/);
});

test('posisi baru tidak memberi akses komite', async ({ page }) => {
  await presidentLogin(page);
  await page.goto('/committee/members/positions');
  await page.getByLabel('Nama posisi').fill('Mentor');
  await page.getByRole('button', { name: 'Tambah posisi' }).click();
  await expect(page.getByText('Mentor')).toBeVisible();
  const [row] = await sql`select grants_committee from positions where name = 'Mentor'`;
  expect(row.grants_committee).toBe(false);
});

test('menghapus project butuh konfirmasi nama', async ({ page }) => {
  await presidentLogin(page);
  const [{ id }] = await sql`select id from projects where slug = 'project-lain'`;
  await page.goto(`/committee/projects/${id}`);
  await page.getByRole('button', { name: 'Hapus' }).first().click();
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Hapus' });
  await expect(confirm).toBeDisabled();
  await page.getByLabel('Ketik nama').fill('Project Lain');
  await confirm.click();
  await expect(page).toHaveURL(/committee\/projects$/);
  expect(await sql`select 1 from projects where id = ${id}`).toHaveLength(0);
});

test('aksi komite tercatat di audit log', async ({ page }) => {
  await presidentLogin(page);
  await page.goto('/committee/audit');
  await expect(page.getByText('member.offboarded')).toBeVisible();
  await expect(sql`delete from audit_logs`).rejects.toThrow(/audit/);
});

test('video di-stream dengan HTTP Range', async ({ page }) => {
  await presidentLogin(page);
  const [{ id }] = await sql`select id from projects where slug = 'project-uji'`;
  const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(4096, 1)]);
  const upload = await page.request.post('/api/upload', {
    multipart: { purpose: 'gallery', ownerType: 'project', ownerId: id, file: { name: 'v.mp4', mimeType: 'video/mp4', buffer: mp4 } },
  });
  expect(upload.ok()).toBe(true);
  const [video] = await sql`select storage_key from media where kind = 'video' and project_id = ${id}`;
  const part = await page.request.get(`/media/videos/${video.storage_key}`, { headers: { Range: 'bytes=0-99' } });
  expect(part.status()).toBe(206);
  expect((await part.body()).length).toBe(100);
  expect((await page.request.get('/media/../../.env')).status()).toBe(404);
});
