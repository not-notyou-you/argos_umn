/**
 * Data contoh untuk pengembangan. Semua nama dan isi di sini fiktif.
 * Jangan jalankan di production.
 */
import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import sharp from 'sharp';
import {
  accounts,
  activities,
  activityMembers,
  carouselSlides,
  involvementRequests,
  media,
  memberPositions,
  members,
  positions,
  projectMembers,
  projects,
} from './schema';

if (process.env.NODE_ENV === 'production') throw new Error('Data contoh tidak boleh masuk production.');

const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const db = drizzle(client);
const dir = path.resolve(process.env.MEDIA_DIR ?? './data/media', 'images');
await mkdir(dir, { recursive: true });

const PALETTE = ['#2F6D7A', '#50919F', '#4E5056', '#A84E17', '#1C1F24', '#66B5C5'];

async function sampleImage(label: string, seed: number) {
  const a = PALETTE[seed % PALETTE.length];
  const b = PALETTE[(seed + 2) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><text x="800" y="520" font-family="Arial" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  const key = createHash('sha256').update(svg).digest('hex').slice(0, 32);
  for (const width of [480, 960, 1600]) {
    await sharp(Buffer.from(svg)).resize({ width }).webp({ quality: 80 }).toFile(path.join(dir, `${key}-${width}.webp`));
  }
  return key;
}

const password = randomBytes(12).toString('base64url');
const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
const allPositions = await db.select().from(positions);
const positionId = (name: string) => allPositions.find((p) => p.name === name)!.id;

const PEOPLE = [
  { username: 'contoh.ketua', fullName: 'Contoh Ketua', major: 'Informatika', cohort: 2023, status: 'onboarded', position: 'President', start: '2026-02-01', end: '2027-01-31' },
  { username: 'contoh.satu', fullName: 'Contoh Member Satu', major: 'Sistem Informasi', cohort: 2024, status: 'onboarded', position: 'IT Admin', start: '2026-02-01', end: null },
  { username: 'contoh.dua', fullName: 'Contoh Member Dua', major: 'Informatika', cohort: 2024, status: 'onboarded', position: 'Comms', start: '2026-03-01', end: null },
  { username: 'contoh.tiga', fullName: 'Contoh Member Tiga', major: 'Teknik Komputer', cohort: 2025, status: 'onboarded', position: 'Member', start: '2026-03-01', end: null },
  { username: 'contoh.alumni', fullName: 'Contoh Alumni', major: 'Informatika', cohort: 2022, status: 'offboarded', position: 'Treasurer', start: '2026-02-01', end: '2026-06-30' },
] as const;

const memberIds: string[] = [];
for (const person of PEOPLE) {
  const [existing] = await db.select().from(accounts).where(eq(accounts.username, person.username));
  if (existing) {
    console.log('Data contoh sudah ada, dilewati.');
    await client.end();
    process.exit(0);
  }
  const [account] = await db.insert(accounts).values({ username: person.username, passwordHash, mustChangePassword: false }).returning();
  const [member] = await db
    .insert(members)
    .values({
      accountId: account.id,
      slug: person.username.replace('.', '-'),
      fullName: person.fullName,
      major: person.major,
      cohort: person.cohort,
      status: person.status,
    })
    .returning();
  await db.insert(memberPositions).values({ memberId: member.id, positionId: positionId(person.position), startDate: person.start, endDate: person.end });
  memberIds.push(member.id);
}

const SAMPLE_PROJECTS = [
  { name: 'Contoh Project Big Data', status: 'on_progress', photos: 6 },
  { name: 'Contoh Project ERP', status: 'done', photos: 5 },
  { name: 'Contoh Project Tanpa Foto', status: 'cancelled', photos: 0 },
] as const;

let seed = 0;
for (const sample of SAMPLE_PROJECTS) {
  const [project] = await db
    .insert(projects)
    .values({
      name: sample.name,
      slug: sample.name.toLowerCase().replaceAll(' ', '-'),
      description: `Ini adalah data contoh untuk menguji tampilan.\n\n${sample.name} akan diganti dengan project sungguhan oleh komite.`,
      status: sample.status,
      isPublished: true,
      publishedAt: new Date(Date.now() - seed * 3_600_000),
      githubUrl: 'https://github.com/',
      githubUrlVisible: true,
      docsUrl: 'https://example.com/',
      docsUrlVisible: sample.photos > 0,
    })
    .returning();
  for (let i = 0; i < sample.photos; i++) {
    const key = await sampleImage(`${sample.name} ${i + 1}`, seed++);
    await db.insert(media).values({ purpose: 'gallery', kind: 'image', source: 'upload', storageKey: key, projectId: project.id, sortOrder: i, isCover: i === 0, altText: `${sample.name} foto ${i + 1}` });
  }
  await db.insert(projectMembers).values(memberIds.slice(0, 3).map((memberId) => ({ projectId: project.id, memberId })));
  seed++;
}

const [activity] = await db
  .insert(activities)
  .values({ name: 'Contoh Workshop', slug: 'contoh-workshop', activityDate: '2026-09-12', description: 'Ini adalah data contoh aktivitas.', isPublished: true, publishedAt: new Date() })
  .returning();
for (let i = 0; i < 5; i++) {
  const key = await sampleImage(`Contoh Workshop ${i + 1}`, seed++);
  await db.insert(media).values({ purpose: 'gallery', kind: 'image', source: 'upload', storageKey: key, activityId: activity.id, sortOrder: i, isCover: i === 0 });
}
await db.insert(activityMembers).values(memberIds.map((memberId) => ({ activityId: activity.id, memberId })));
await db.insert(involvementRequests).values({ memberId: memberIds[3], activityId: null, projectId: (await db.select().from(projects))[0].id, note: 'Contoh request keterlibatan.' });

for (let i = 0; i < 3; i++) {
  const key = await sampleImage(`Slide Contoh ${i + 1}`, seed++);
  const [item] = await db.insert(media).values({ purpose: 'carousel', kind: 'image', source: 'upload', storageKey: key, altText: `Slide contoh ${i + 1}` }).returning();
  await db.insert(carouselSlides).values({ mediaId: item.id, caption: `Slide contoh ${i + 1}`, sortOrder: i });
}

console.log(`Data contoh dibuat. Password semua member contoh: ${password}`);
await client.end();
