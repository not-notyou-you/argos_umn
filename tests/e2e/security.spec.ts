import { hash } from '@node-rs/argon2';
import { type APIRequestContext, type Browser, type Page, expect, test } from '@playwright/test';
import postgres from 'postgres';
import sharp from 'sharp';

/** Regresi pen test. Setiap skenario adalah serangan yang harus gagal. */

const BASE = 'http://localhost:3100';
const sql = postgres(process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:5432/argos_umn_test', { max: 1, onnotice: () => {} });
const PASSWORD = 'sec-password-yang-panjang';
let projectId = '';
let draftId = '';
let committeeId = '';
let victimId = '';

async function makeMember(username: string, status = 'onboarded') {
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const [account] = await sql`insert into accounts (username, password_hash, must_change_password) values (${username}, ${passwordHash}, false) returning id`;
  const [member] = await sql`insert into members (account_id, slug, full_name, status) values (${account.id}, ${username.replace('.', '-')}, ${username}, ${status}) returning id`;
  return { accountId: account.id as string, memberId: member.id as string };
}

async function login(page: Page, username: string, password = PASSWORD) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

async function session(browser: Browser, username: string, password = PASSWORD) {
  const context = await browser.newContext({ baseURL: BASE });
  const page = await context.newPage();
  await login(page, username, password);
  await expect(page).not.toHaveURL(/login/);
  await page.waitForLoadState('networkidle');
  return page;
}

type Captured = { action: string; contentType: string; body: Buffer; url: string };

/** Merekam panggilan Server Action asli agar bisa diputar ulang dengan akun lain. */
async function capture(page: Page, trigger: () => Promise<unknown>): Promise<Captured> {
  const request = page.waitForRequest((r) => r.method() === 'POST' && Boolean(r.headers()['next-action']));
  await trigger();
  const r = await request;
  return { action: r.headers()['next-action'], contentType: r.headers()['content-type'], body: r.postDataBuffer()!, url: r.url() };
}

const replay = (request: APIRequestContext, c: Captured) =>
  request.post(c.url, { headers: { 'next-action': c.action, 'content-type': c.contentType, origin: BASE }, data: c.body });

const png = () => sharp({ create: { width: 200, height: 200, channels: 3, background: '#2f6d7a' } }).png().toBuffer();

test.beforeAll(async () => {
  await sql`delete from login_attempts`;
  await sql`delete from accounts where username like 'sec.%'`;
  await sql`delete from projects where slug like 'sec-%'`;
  const adminHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  await sql`update accounts set password_hash = ${adminHash}, must_change_password = false where kind = 'system'`;

  const attacker = await makeMember('sec.attacker');
  const victim = await makeMember('sec.victim');
  const committee = await makeMember('sec.committee');
  committeeId = committee.memberId;
  victimId = victim.memberId;
  await sql`insert into member_positions (member_id, position_id, start_date, end_date)
    select ${committee.memberId}, id, '2026-01-01', '2099-12-31' from positions where name = 'Secretary'`;

  const [project] = await sql`insert into projects (name, slug, is_published, published_at) values ('Sec Project', 'sec-project', true, now()) returning id`;
  projectId = project.id;
  await sql`insert into project_members (project_id, member_id) values (${projectId}, ${attacker.memberId})`;
  const [draft] = await sql`insert into projects (name, slug, description) values ('Sec Draft', 'sec-draft', 'rahasia-draft') returning id`;
  draftId = draft.id;
  await sql`update members set major = 'Jurusan-Rahasia', cohort = 1999, show_major = false, show_cohort = false where id = ${victim.memberId}`;
});

test.afterAll(() => sql.end());

test.describe('otorisasi', () => {
  test('member tidak bisa memutar ulang aksi komite', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await admin.locator('select[name="status"]').selectOption('cancelled');
    const setStatus = await capture(admin, () => admin.getByRole('button', { name: 'Simpan' }).first().click());
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    await sql`update projects set status = 'on_progress' where id = ${projectId}`;

    const member = await session(browser, 'sec.attacker');
    await replay(member.request, setStatus);
    const [row] = await sql`select status from projects where id = ${projectId}`;
    expect(row.status).toBe('on_progress');

    // Tamu tanpa cookie juga gagal.
    const guest = await browser.newContext({ baseURL: BASE });
    await replay(guest.request, setStatus);
    const [again] = await sql`select status from projects where id = ${projectId}`;
    expect(again.status).toBe('on_progress');
    await guest.close();
  });

  test('field tambahan pada form anggota diabaikan server', async ({ browser }) => {
    const member = await session(browser, 'sec.attacker');
    await member.goto(`/me/projects/${projectId}`, { waitUntil: 'networkidle' });
    await member.evaluate(() => {
      const form = document.querySelector('form[method="post"]')!;
      for (const [name, value] of [['status', 'cancelled'], ['isPublished', 'false'], ['slug', 'dibajak']]) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.append(input);
      }
    });
    await member.getByRole('button', { name: 'Simpan' }).click();
    await expect(member.getByText('Tersimpan.')).toBeVisible();
    const [row] = await sql`select status, is_published, slug from projects where id = ${projectId}`;
    expect(row).toMatchObject({ status: 'on_progress', is_published: true, slug: 'sec-project' });
  });

  test('komite non-seeder tidak bisa me-reset akun seeder', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto('/committee/system', { waitUntil: 'networkidle' });
    const reset = await capture(admin, () => admin.getByRole('button', { name: 'Reset password' }).first().click());
    await expect(admin.getByTestId('temp-password')).toBeVisible();
    const hashes = async () => (await sql`select password_hash from accounts where username = 'secretary-1'`)[0].password_hash;
    const before = await hashes();

    const committee = await session(browser, 'sec.committee');
    await replay(committee.request, reset);
    expect(await hashes()).toBe(before);
    await sql`update accounts set must_change_password = false where kind = 'system'`;
  });

  test('member tidak bisa mengganti avatar atau logo orang lain', async ({ browser }) => {
    const member = await session(browser, 'sec.attacker');
    const file = { name: 'a.png', mimeType: 'image/png', buffer: await png() };
    const avatar = await member.request.post('/api/upload', { multipart: { purpose: 'avatar', ownerType: 'member', ownerId: victimId, file } });
    expect(avatar.status()).toBe(403);
    const logo = await member.request.post('/api/upload', { multipart: { purpose: 'logo', ownerType: 'project', ownerId: draftId, file } });
    expect(logo.status()).toBe(403);
    const carousel = await member.request.post('/api/upload', { multipart: { purpose: 'carousel', file } });
    expect(carousel.status()).toBe(403);
  });

  test('tujuan upload harus cocok dengan jenis pemilik', async ({ browser }) => {
    const member = await session(browser, 'sec.attacker');
    const file = { name: 'a.png', mimeType: 'image/png', buffer: await png() };
    const before = (await sql`select count(*)::int n from media`)[0].n;
    const response = await member.request.post('/api/upload', { multipart: { purpose: 'avatar', ownerType: 'project', ownerId: projectId, file } });
    expect(response.status()).toBe(403);
    expect((await sql`select count(*)::int n from media`)[0].n).toBe(before);
  });

  test('tamu tidak bisa upload', async ({ request }) => {
    const response = await request.post('/api/upload', { multipart: { purpose: 'carousel', file: { name: 'a.png', mimeType: 'image/png', buffer: await png() } } });
    expect(response.status()).toBe(401);
  });

  test('member offboarded yang masih memegang cookie tidak bisa apa-apa', async ({ browser }) => {
    const { memberId } = await makeMember('sec.leaver');
    const page = await session(browser, 'sec.leaver');
    const state = await page.context().storageState();
    await sql`update members set status = 'offboarded' where id = ${memberId}`;
    const stale = await browser.newContext({ baseURL: BASE, storageState: state });
    const response = await stale.request.post('/api/upload', { multipart: { purpose: 'avatar', ownerType: 'member', ownerId: memberId, file: { name: 'a.png', mimeType: 'image/png', buffer: await png() } } });
    expect(response.status()).toBe(401);
    await stale.close();
  });
});

test.describe('kebocoran data', () => {
  test('draft tidak bisa dilihat publik', async ({ page }) => {
    await page.goto('/projects/sec-draft');
    await expect(page.getByText('rahasia-draft')).toHaveCount(0);
    await page.goto('/projects');
    await expect(page.getByText('Sec Draft')).toHaveCount(0);
  });

  test('data yang disembunyikan tidak ada di HTML maupun payload', async ({ request }) => {
    for (const path of ['/members/sec-victim', '/members?cohort=1999', '/members']) {
      const html = await (await request.get(path)).text();
      expect(html).not.toContain('Jurusan-Rahasia');
    }
    const byCohort = await (await request.get('/members?cohort=1999')).text();
    expect(byCohort).not.toContain('sec.victim');
  });

  test('hash password dan username tidak pernah terkirim', async ({ browser }) => {
    const admin = await session(browser, 'president');
    for (const path of [`/committee/members/${committeeId}?tab=account`, '/committee/system', '/committee/audit']) {
      const html = await (await admin.request.get(path)).text();
      expect(html).not.toContain('$argon2');
    }
  });

  test('berkas sensitif tidak bisa diambil lewat path traversal', async ({ request }) => {
    for (const path of ['/media/..%2f..%2f.env', '/media/%2e%2e/%2e%2e/.env', '/media/images/..%5c..%5c.env', '/media/images/%2e%2e%2f%2e%2e%2fpackage.json', '/.env', '/.git/config', '/package.json']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
    }
  });

  test('stack trace tidak bocor pada input aneh', async ({ request }) => {
    for (const path of ['/projects?status[]=x&q=a&q=b', '/members?tab=a&tab=b&q=a&q=b&cohort=x', '/galleries?limit=99999999&filter=a&filter=b', '/projects/%27%20or%201=1--', "/members/'%3b--", '/projects?q=%25%27%22%3Cscript%3E']) {
      const response = await request.get(path);
      expect(response.status(), path).toBeLessThan(500);
      expect(await response.text()).not.toMatch(/node_modules|at async|ECONN|PostgresError/);
    }
  });
});

test.describe('injeksi', () => {
  test('XSS tersimpan tidak tereksekusi', async ({ browser }) => {
    const payload = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';
    const member = await session(browser, 'sec.attacker');
    await member.goto(`/me/projects/${projectId}`, { waitUntil: 'networkidle' });
    await member.getByLabel('Deskripsi').fill(payload);
    await member.getByRole('button', { name: 'Simpan' }).click();
    await expect(member.getByText('Tersimpan.')).toBeVisible();
    await member.goto('/projects/sec-project', { waitUntil: 'networkidle' });
    await expect(member.getByText(payload)).toBeVisible();
    expect(await member.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('URL javascript: ditolak di tombol project', async ({ browser }) => {
    const member = await session(browser, 'sec.attacker');
    await member.goto(`/me/projects/${projectId}`, { waitUntil: 'networkidle' });
    await member.locator('input[name="projectUrl"]').evaluate((el: HTMLInputElement) => {
      el.type = 'text';
      el.value = 'javascript:alert(1)';
    });
    await member.getByRole('button', { name: 'Simpan' }).click();
    await expect(member.getByText('URL harus diawali')).toBeVisible();
    const [row] = await sql`select project_url from projects where id = ${projectId}`;
    expect(row.project_url).toBeNull();
  });

  test('SQL injection pada login dan pencarian tidak berefek', async ({ page, request }) => {
    await login(page, "' OR 1=1 --", "' OR '1'='1");
    await expect(page.getByText('Username atau password salah.')).toBeVisible();
    const response = await request.get(`/projects?q=${encodeURIComponent("'; drop table accounts; --")}`);
    expect(response.status()).toBe(200);
    expect((await sql`select count(*)::int n from accounts`)[0].n).toBeGreaterThan(0);
    await sql`delete from login_attempts`;
  });

  test('upload berbahaya ditolak', async ({ browser }) => {
    const admin = await session(browser, 'president');
    const send = (name: string, mimeType: string, buffer: Buffer) =>
      admin.request.post('/api/upload', { multipart: { purpose: 'gallery', ownerType: 'project', ownerId: projectId, file: { name, mimeType, buffer } } });

    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect((await send('x.svg', 'image/svg+xml', svg)).status()).toBe(400);
    expect((await send('x.png', 'image/png', svg)).status()).toBe(400);
    expect((await send('x.html', 'video/mp4', Buffer.from('<html><script>alert(1)</script>'))).status()).toBe(400);
  });

  test('bom dekompresi gambar ditolak', async ({ browser }) => {
    const admin = await session(browser, 'president');
    const bomb = await sharp({ create: { width: 9000, height: 9000, channels: 3, background: '#000000' } }).png({ compressionLevel: 9 }).toBuffer();
    const response = await admin.request.post('/api/upload', {
      multipart: { purpose: 'gallery', ownerType: 'project', ownerId: projectId, file: { name: 'b.png', mimeType: 'image/png', buffer: bomb } },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('CSRF dan redirect', () => {
  test('upload dari origin lain ditolak walau cookie ikut terkirim', async ({ browser }) => {
    const admin = await session(browser, 'president');
    const response = await admin.request.post('/api/upload', {
      headers: { origin: 'https://evil.example' },
      multipart: { purpose: 'carousel', file: { name: 'a.png', mimeType: 'image/png', buffer: await png() } },
    });
    expect(response.status()).toBe(403);
  });

  test('Server Action dari origin lain ditolak', async ({ browser }) => {
    const admin = await session(browser, 'president');
    await admin.goto(`/committee/projects/${projectId}`, { waitUntil: 'networkidle' });
    await admin.locator('select[name="status"]').selectOption('done');
    const captured = await capture(admin, () => admin.getByRole('button', { name: 'Simpan' }).first().click());
    await expect(admin.getByText('Tersimpan.')).toBeVisible();
    await sql`update projects set status = 'on_progress' where id = ${projectId}`;

    await admin.request.post(captured.url, { headers: { 'next-action': captured.action, 'content-type': captured.contentType, origin: 'https://evil.example' }, data: captured.body });
    expect((await sql`select status from projects where id = ${projectId}`)[0].status).toBe('on_progress');
  });

  test('pemilih bahasa bukan open redirect', async ({ page }) => {
    const visited: string[] = [];
    await page.route('**/*', (route) => {
      if (route.request().isNavigationRequest()) visited.push(new URL(route.request().url()).hostname);
      return new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort();
    });
    for (const evil of ['//evil.example/', '/\\evil.example/', '/\t/evil.example/', 'https://evil.example/']) {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.locator('input[name="path"]').first().evaluate((el: HTMLInputElement, value) => {
        el.value = value;
      }, evil);
      await page.getByRole('button', { name: 'id', exact: true }).first().click();
      await page.waitForTimeout(1000);
      expect(visited.filter((host) => host !== 'localhost'), evil).toEqual([]);
    }
  });
});

test.describe('brute force', () => {
  const attempt = async (browser: Browser, username: string, password: string, headers: Record<string, string>) => {
    const context = await browser.newContext({ baseURL: BASE, extraHTTPHeaders: headers });
    const page = await context.newPage();
    await login(page, username, password);
    // Berhasil: pindah halaman. Gagal: pesan status muncul.
    await Promise.race([page.waitForURL(/me\/profile/), page.getByRole('status').first().waitFor()]);
    const failed = page.url().includes('/login');
    const message = failed ? await page.getByRole('status').first().textContent() : '';
    await context.close();
    return { failed, message };
  };

  test('memalsukan X-Forwarded-For tidak melewati batas login', async ({ browser }) => {
    await makeMember('sec.brute');
    for (let i = 0; i < 21; i++) await attempt(browser, 'sec.brute', 'tebakan-salah-panjang', { 'x-forwarded-for': `10.0.0.${i}` });
    const last = await attempt(browser, 'sec.brute', PASSWORD, { 'x-forwarded-for': '10.9.9.9' });
    expect(last.failed).toBe(true);
    expect(last.message).toContain('Terlalu banyak percobaan');
    await sql`delete from login_attempts`;
  });

  test('penyerang tidak bisa mengunci akun korban dari IP lain', async ({ browser }) => {
    await makeMember('sec.lockout');
    for (let i = 0; i < 6; i++) await attempt(browser, 'sec.lockout', 'tebakan-salah-panjang', { 'cf-connecting-ip': '203.0.113.1' });
    const victim = await attempt(browser, 'sec.lockout', PASSWORD, { 'cf-connecting-ip': '203.0.113.2' });
    expect(victim.failed).toBe(false);
    await sql`delete from login_attempts`;
  });

  test('password raksasa ditolak tanpa diproses', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.getByLabel('Username').fill('sec.attacker');
    await page.getByLabel('Password').fill('a'.repeat(100_000));
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByText('Username atau password salah.')).toBeVisible();
    await sql`delete from login_attempts`;
  });

  test('password sementara tidak boleh dipakai ulang sebagai password baru', async ({ browser }) => {
    const { accountId } = await makeMember('sec.reuse');
    await sql`update accounts set must_change_password = true where id = ${accountId}`;
    const context = await browser.newContext({ baseURL: BASE });
    const page = await context.newPage();
    await login(page, 'sec.reuse');
    await expect(page).toHaveURL(/account\/password/);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Password saat ini').fill(PASSWORD);
    await page.getByLabel('Password baru', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Ulangi password baru').fill(PASSWORD);
    await page.getByRole('button', { name: 'Simpan password' }).click();
    await expect(page.getByText('Password baru harus berbeda')).toBeVisible();
    expect((await sql`select must_change_password from accounts where id = ${accountId}`)[0].must_change_password).toBe(true);
    await context.close();
  });
});

test.describe('header dan permukaan serangan', () => {
  test('cookie sesi dilindungi', async ({ browser }) => {
    const page = await session(browser, 'sec.attacker');
    const cookie = (await page.context().cookies()).find((c) => c.name === 'argos_session')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(await page.evaluate(() => document.cookie)).not.toContain('argos_session');
  });

  test('header keamanan ada di halaman dan media', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(headers['content-security-policy']).toContain("object-src 'none'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['x-powered-by']).toBeUndefined();
  });

  test('CSP memakai nonce dan semua script Next.js lolos', async ({ page, request }) => {
    const first = (await request.get('/')).headers()['content-security-policy'];
    const second = (await request.get('/')).headers()['content-security-policy'];
    const scriptSrc = first.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(scriptSrc).toContain("'nonce-");
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(first).not.toBe(second);

    const violations: string[] = [];
    page.on('console', (m) => /Content Security Policy/i.test(m.text()) && violations.push(m.text()));
    await page.goto('/en', { waitUntil: 'networkidle' });
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.goto('/projects', { waitUntil: 'networkidle' });
    expect(violations).toEqual([]);
    // Script inline dari penyerang tanpa nonce diblokir browser.
    const blocked = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__injected = 1';
      document.body.append(script);
      return (window as unknown as { __injected?: number }).__injected;
    });
    expect(blocked).toBeUndefined();
  });

  test('optimizer gambar Next.js dimatikan', async ({ request }) => {
    const response = await request.get('/_next/image?url=%2Fbrand%2Fargos-logo.png&w=3840&q=100');
    expect(response.status()).not.toBe(200);
  });

  test('header bypass middleware tidak berefek', async ({ request }) => {
    const response = await request.get('/committee', {
      headers: { 'x-middleware-subrequest': 'src/proxy:src/proxy:src/proxy:src/proxy:src/proxy' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain('/login');
  });
});
