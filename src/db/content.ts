/**
 * Mengisi project dan aktivitas awal. Foto berasal dari assets/photo dan bersifat
 * sementara, disebar acak ke semua agenda. Jangan jalankan di production.
 *
 * Pemakaian: npm run db:content
 */
import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { eq, inArray, like } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from './index';
import {
  activities,
  activityMembers,
  carouselSlides,
  involvementRequests,
  media,
  members,
  projectMembers,
  projects,
} from './schema';
import { storeImage } from '../lib/media';

if (process.env.NODE_ENV === 'production') throw new Error('Skrip ini tidak boleh dijalankan di production.');

const REPO = 'https://github.com/not-notyou-you';
const LOGOS = path.resolve('assets/logos/projects');

const PROJECTS = [
  {
    name: 'Orbit-U: The DataLab',
    slug: 'orbit-u-datalab',
    logo: 'orbit-u-datalab.webp',
    status: 'on_progress',
    githubUrl: `${REPO}/orbit_u_datalab`,
    docsUrl: `${REPO}/orbit_u_datalab/tree/HEAD/DOCS`,
    description:
      'Data lake satelit multi-modal untuk riset deteksi banjir. Pengguna memilih sendiri satelit, tingkat pemrosesan, strategi fusi, dan preview saat membuat dataset.\n\nData Sentinel-1, MODIS, dan GPM IMERG diolah lewat pipeline masing-masing, lalu digabung menjadi satu berkas HDF5 per tanggal yang siap dipakai machine learning. Setiap tahap punya lineage dengan checksum SHA-256.\n\nFitur Live Monitoring memantau hingga 5 area secara otomatis empat kali sehari, lengkap dengan preview, kalimat kondisi yang mudah dipahami, dan laporan PDF per dataset.',
  },
  {
    name: 'Orbit-U: The Monitor',
    slug: 'orbit-u-monitor',
    logo: 'orbit-u-monitor.png',
    status: 'on_progress',
    githubUrl: `${REPO}/orbit_u_monitor`,
    docsUrl: `${REPO}/orbit_u_monitor/tree/HEAD/DOCS`,
    description:
      'Sistem basis data monitoring hidrometeorologi dan arsip kejadian bencana untuk Gugus Mitigasi Lebak Selatan di Bayah, Kabupaten Lebak, Banten. Dikembangkan dari Orbit-U: The DataLab.\n\nSistem mengumpulkan data Sentinel-1, MODIS, dan GPM secara otomatis, menyajikan kondisi terkini kepada publik dan relawan, memberi peringatan saat hujan melewati ambang, mencatat kejadian bencana, serta membuat laporan mingguan dan bulanan.\n\nData hujan GPM harian menjadi tulang punggung monitoring, sedangkan Sentinel-1 berperan sebagai verifikasi pasca-kejadian.',
  },
  {
    name: 'Water on Jabodetabek',
    slug: 'water-on-jabodetabek',
    logo: null,
    status: 'done',
    projectUrl: 'https://water-on-jabodetabek.streamlit.app/',
    githubUrl: `${REPO}/water-on-jabodetabek`,
    docsUrl: `${REPO}/water-on-jabodetabek#readme`,
    description:
      'Aplikasi Streamlit untuk memprediksi peta genangan Jabodetabek pada observasi Sentinel-1 berikutnya, memakai model ContextCNN.\n\nAda dua mode. Simulasi skenario mengatur curah hujan dan jarak hari lewat slider atau preset Kemarau, Normal, dan Ekstrem. Cek tanggal mengambil curah hujan GPM IMERG aktual dari NASA untuk tanggal yang dipilih.',
  },
  {
    name: 'Watch Wajo',
    slug: 'watch-wajo',
    logo: 'watch-wajo.svg',
    status: 'done',
    projectUrl: 'https://watchwajo.streamlit.app/',
    githubUrl: `${REPO}/watch_wajo`,
    docsUrl: `${REPO}/watch_wajo#readme`,
    description:
      'Aplikasi Streamlit untuk memprediksi luas genangan air di Kabupaten Wajo pada observasi berikutnya.\n\nMasukannya adalah riwayat observasi multisensor dari Sentinel-1, MODIS, dan GPM, yang diolah oleh model 1D-CNN dengan lookback 6 observasi. Repositorinya menyertakan contoh CSV untuk mencoba berbagai kasus.',
  },
] as const;

const ACTIVITIES = [
  {
    name: 'On Boarding Februari 2026',
    slug: 'on-boarding-februari-2026',
    activityDate: '2026-02-13',
    description:
      'Penyambutan anggota pertama Argos Club @ UMN. Peserta berkenalan dengan klub, The IO Foundation, dan jaringan Argos Clubs, lalu mencoba langsung lab bersama mentor.\n\nDi sesi ini anggota baru memahami cara kerja komunitas, pilihan peran, dan jalur belajar yang bisa diambil selama bergabung.',
  },
  {
    name: 'IETF 125',
    slug: 'ietf-125',
    activityDate: '2026-04-18',
    description:
      'Anggota Argos Club mengikuti rangkaian kegiatan IETF 125 untuk mengenal bagaimana standar internet dibahas dan disepakati.\n\nPeserta belajar membaca draft, mengikuti diskusi working group, dan melihat langsung bagaimana komunitas teknis global bekerja.',
  },
  {
    name: 'On Boarding September 2026',
    slug: 'on-boarding-september-2026',
    activityDate: '2026-09-18',
    description:
      'Penyambutan anggota baru angkatan September. Peserta mendapat pengenalan klub, bidang fokus, dan project yang sedang berjalan.\n\nSesi ditutup dengan praktik langsung di lab, supaya anggota baru bisa merasakan cara belajar di Argos Club sejak hari pertama.',
  },
  {
    name: 'n8n Workshop',
    slug: 'n8n-workshop',
    activityDate: '2026-10-10',
    description:
      'Workshop otomasi alur kerja menggunakan n8n. Peserta belajar menghubungkan berbagai layanan, mengolah data, dan membangun workflow pertama mereka tanpa harus banyak menulis kode.\n\nKegiatan ini juga menjadi persiapan untuk n8n Competition.',
  },
  {
    name: 'n8n Competition',
    slug: 'n8n-competition',
    activityDate: '2026-10-24',
    description:
      'Kompetisi membangun solusi otomasi dengan n8n. Peserta menerapkan hasil workshop untuk menyelesaikan masalah nyata, lalu mempresentasikan workflow buatannya.\n\nPenilaian berfokus pada manfaat solusi, ketepatan alur, dan kejelasan presentasi.',
  },
  {
    name: '2026 Showcase',
    slug: '2026-showcase',
    activityDate: '2026-12-12',
    description:
      'Acara penutup tahun untuk menampilkan project dan perjalanan Argos Club @ UMN sepanjang 2026.\n\nAnggota mempresentasikan karya mereka kepada dosen, mahasiswa, dan mitra, sekaligus merayakan kerja bersama selama satu tahun.',
  },
];

/** Generator acak dengan seed tetap, agar hasil bisa diulang. */
function shuffle<T>(items: T[], seed = 2026) {
  const list = [...items];
  let state = seed;
  const next = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

async function findPhotos(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return findPhotos(full);
      return Promise.resolve(e.name.toLowerCase().endsWith('.webp') ? [full] : []);
    }),
  );
  return nested.flat();
}

async function storeLogo(file: string | null) {
  if (!file) return null;
  const full = path.join(LOGOS, file);
  const input = file.endsWith('.svg')
    ? await sharp(full, { density: 600 }).resize(512).png().toBuffer()
    : await readFile(full);
  const stored = await storeImage(input);
  const [item] = await db.insert(media).values({ purpose: 'logo', kind: 'image', source: 'upload', ...stored }).returning();
  return item.id;
}

// Membersihkan data contoh dan hasil skrip ini sebelumnya, sehingga aman dijalankan ulang.
const slides = await db.select({ mediaId: carouselSlides.mediaId }).from(carouselSlides);
await db.delete(carouselSlides);
if (slides.length) await db.delete(media).where(inArray(media.id, slides.map((s) => s.mediaId)));
await db.delete(involvementRequests);
await db.delete(projects).where(like(projects.slug, 'contoh-%'));
await db.delete(activities).where(like(activities.slug, 'contoh-%'));
await db.delete(projects).where(inArray(projects.slug, PROJECTS.map((p) => p.slug)));
await db.delete(activities).where(inArray(activities.slug, ACTIVITIES.map((a) => a.slug)));
await db.delete(media).where(eq(media.purpose, 'logo'));

const photos = shuffle(await findPhotos(path.resolve('assets/photo')));
const people = (await db.select({ id: members.id }).from(members).where(eq(members.status, 'onboarded'))).map((m) => m.id);

const slots = 10;
const pick = (index: number) => photos.filter((_, i) => i % slots === index);

let slot = 0;
for (const [i, { logo, ...project }] of PROJECTS.entries()) {
  const logoMediaId = await storeLogo(logo);
  const [row] = await db
    .insert(projects)
    .values({
      ...project,
      logoMediaId,
      isPublished: true,
      publishedAt: new Date(Date.now() - i * 3_600_000),
      githubUrlVisible: true,
      docsUrlVisible: true,
      projectUrlVisible: 'projectUrl' in project,
    })
    .returning();
  await addPhotos(pick(slot++), { projectId: row.id }, row.name);
  const team = shuffle(people, i + 1).slice(0, 3);
  if (team.length) await db.insert(projectMembers).values(team.map((memberId) => ({ projectId: row.id, memberId })));
}

for (const [i, activity] of ACTIVITIES.entries()) {
  const [row] = await db.insert(activities).values({ ...activity, isPublished: true, publishedAt: new Date() }).returning();
  await addPhotos(pick(slot++), { activityId: row.id }, row.name);
  const team = shuffle(people, i + 11).slice(0, 3);
  if (team.length) await db.insert(activityMembers).values(team.map((memberId) => ({ activityId: row.id, memberId })));
}

async function addPhotos(files: string[], owner: { projectId: string } | { activityId: string }, name: string) {
  for (const [i, file] of files.entries()) {
    const stored = await storeImage(await readFile(file));
    await db.insert(media).values({
      ...owner,
      ...stored,
      purpose: 'gallery',
      kind: 'image',
      source: 'upload',
      sortOrder: i,
      isCover: i === 0,
      altText: `${name}, foto ${i + 1}`,
    });
  }
}

// Carousel memakai foto yang lebar agar tidak terpotong terlalu banyak.
const wide: string[] = [];
for (const file of photos) {
  const { width, height } = await sharp(file).metadata();
  if (width / height >= 1.3) wide.push(file);
}
for (const [i, file] of wide.slice(6, 10).entries()) {
  const stored = await storeImage(await readFile(file));
  const altText = `Kegiatan Argos Club @ UMN, foto ${i + 1}`;
  const [item] = await db.insert(media).values({ ...stored, purpose: 'carousel', kind: 'image', source: 'upload', altText }).returning();
  await db.insert(carouselSlides).values({ mediaId: item.id, caption: altText, sortOrder: i });
}

console.log(`Selesai: ${PROJECTS.length} project, ${ACTIVITIES.length} aktivitas, ${photos.length} foto.`);
process.exit(0);
