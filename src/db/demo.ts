/**
 * Data contoh untuk pengembangan. Semua nama dan isi di sini fiktif.
 * Jangan jalankan di production.
 */
import 'dotenv/config';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { hash } from '@node-rs/argon2';
import { and, eq, inArray, like } from 'drizzle-orm';
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
  projectProposals,
  projectTimelineItems,
  projects,
  timelineRequests,
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

// Jalankan ulang aman: data contoh lama dihapus dulu (akun contoh.*, konten berslug contoh-*).
await db.delete(accounts).where(like(accounts.username, 'contoh.%'));
await db.delete(projects).where(like(projects.slug, 'contoh-%'));
await db.delete(activities).where(like(activities.slug, 'contoh-%'));
const oldSlides = await db.select({ mediaId: carouselSlides.mediaId }).from(carouselSlides).where(like(carouselSlides.caption, 'Slide contoh%'));
if (oldSlides.length) await db.delete(media).where(inArray(media.id, oldSlides.map((s) => s.mediaId)));

const PEOPLE = [
  { username: 'contoh.ketua', fullName: 'Contoh Ketua', major: 'Informatika', cohort: 2023, status: 'onboarded', position: 'President', start: '2026-02-01', end: '2027-01-31' },
  { username: 'contoh.satu', fullName: 'Contoh Member Satu', major: 'Sistem Informasi', cohort: 2024, status: 'onboarded', position: 'IT Admin', start: '2026-02-01', end: null },
  { username: 'contoh.dua', fullName: 'Contoh Member Dua', major: 'Informatika', cohort: 2024, status: 'onboarded', position: 'Comms', start: '2026-03-01', end: null },
  { username: 'contoh.tiga', fullName: 'Contoh Member Tiga', major: 'Teknik Komputer', cohort: 2025, status: 'onboarded', position: 'Member', start: '2026-03-01', end: null },
  { username: 'contoh.empat', fullName: 'Contoh Member Empat', major: 'Informatika', cohort: 2025, status: 'onboarded', position: 'Member', start: '2026-03-01', end: null },
  { username: 'contoh.lima', fullName: 'Contoh Member Lima', major: 'Sistem Informasi', cohort: 2023, status: 'onboarded', position: 'Member', start: '2026-02-01', end: null },
  { username: 'contoh.enam', fullName: 'Contoh Member Enam', major: 'Teknik Elektro', cohort: 2024, status: 'onboarded', position: 'Member', start: '2026-04-01', end: null },
  { username: 'contoh.tujuh', fullName: 'Contoh Member Tujuh', major: 'Informatika', cohort: 2025, status: 'onboarded', position: 'Member', start: '2026-04-01', end: null },
  { username: 'contoh.delapan', fullName: 'Contoh Member Delapan', major: 'Teknik Komputer', cohort: 2024, status: 'onboarded', position: 'Member', start: '2026-05-01', end: null },
  { username: 'contoh.sembilan', fullName: 'Contoh Member Sembilan', major: 'Sistem Informasi', cohort: 2025, status: 'onboarded', position: 'Member', start: '2026-05-01', end: null },
  { username: 'contoh.sepuluh', fullName: 'Contoh Member Sepuluh', major: 'Informatika', cohort: 2026, status: 'onboarded', position: 'Member', start: '2026-09-01', end: null },
  { username: 'contoh.sebelas', fullName: 'Contoh Member Sebelas', major: 'Informatika', cohort: 2026, status: 'onboarded', position: 'Member', start: '2026-09-01', end: null },
  { username: 'contoh.alumni', fullName: 'Contoh Alumni', major: 'Informatika', cohort: 2022, status: 'offboarded', position: 'Treasurer', start: '2026-02-01', end: '2026-06-30' },
] as const;

const memberIds: string[] = [];
for (const person of PEOPLE) {
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

type Stage = [title: string, start: string, end: string, completedAt: string | null, description: string];

/**
 * Dua project per status. `team` dan `applicants` adalah indeks ke PEOPLE. Project tidak diberi foto agar placeholder terlihat.
 * Nama dan isi fiktif, tetapi ditulis seperti project sungguhan; slug tetap berawalan `contoh-` agar bisa dibersihkan.
 */
const SAMPLE_PROJECTS: { name: string; status: 'open' | 'on_progress' | 'done' | 'cancelled'; description: string; team: number[]; applicants?: number[]; stages: Stage[] }[] = [
  {
    name: 'Argos Compute Cluster',
    status: 'open',
    description:
      'Membangun cluster komputasi kecil dari empat server bekas laboratorium untuk kebutuhan latihan HPC anggota. Cluster memakai Slurm sebagai penjadwal job, penyimpanan bersama berbasis NFS, dan monitoring dengan Prometheus serta Grafana.\n\nTarget akhirnya adalah lingkungan tempat anggota bisa menjalankan job MPI dan pelatihan model skala kecil tanpa bergantung pada layanan cloud berbayar. Kami mencari anggota yang tertarik pada Linux, jaringan, dan otomasi dengan Ansible.',
    team: [],
    applicants: [3, 9],
    stages: [
      ['Open recruitment', '2026-11-01', '2026-11-20', null, 'Seleksi 4–6 anggota, pembagian peran admin sistem, jaringan, dan dokumentasi.'],
      ['Audit perangkat keras', '2026-11-21', '2026-12-05', null, 'Inventarisasi CPU, RAM, dan disk tiap server; penggantian komponen yang rusak.'],
      ['Provisioning dengan Ansible', '2026-12-06', '2027-01-10', null, 'Playbook instalasi OS, akun pengguna, NFS, dan Slurm agar node bisa dibangun ulang kapan saja.'],
      ['Benchmark dan dokumentasi', '2027-01-11', '2027-02-15', null, 'Uji HPL dan job MPI contoh, lalu panduan penggunaan untuk anggota.'],
    ],
  },
  {
    name: 'Asisten FAQ Akademik',
    status: 'open',
    description:
      'Chatbot berbasis retrieval-augmented generation yang menjawab pertanyaan umum mahasiswa seputar KRS, cuti akademik, dan prosedur administrasi, dengan sumber jawaban dari dokumen panduan resmi kampus.\n\nSetiap jawaban wajib menyertakan kutipan dokumen sumber agar bisa diperiksa. Model dijalankan secara lokal, jadi pertanyaan mahasiswa tidak dikirim ke layanan pihak ketiga.',
    team: [1],
    applicants: [10],
    stages: [
      ['Open recruitment', '2026-11-01', '2026-11-30', null, 'Mencari 3 anggota: pengolahan data, backend, dan evaluasi jawaban.'],
      ['Kurasi dokumen sumber', '2026-12-01', '2027-01-15', null, 'Mengumpulkan dan membersihkan dokumen panduan, lalu memecahnya menjadi potongan teks berindeks.'],
      ['Prototipe dan evaluasi', '2027-01-16', '2027-03-15', null, 'Prototipe RAG dengan 100 pertanyaan uji; target ketepatan jawaban di atas 85%.'],
    ],
  },
  {
    name: 'Dashboard Analitik Peminjaman Lab',
    status: 'on_progress',
    description:
      'Pipeline data yang mengolah log peminjaman ruang dan perangkat laboratorium menjadi dashboard pemakaian. Data harian dimuat dengan Apache Airflow ke PostgreSQL, lalu divisualisasikan dengan Apache Superset.\n\nDashboard membantu pengelola lab melihat jam sibuk, perangkat yang jarang dipakai, dan pola peminjaman per semester sebagai dasar perencanaan pengadaan.',
    team: [0, 1, 4, 7],
    stages: [
      ['Pemetaan kebutuhan', '2026-07-01', '2026-07-31', '2026-07-28', 'Wawancara pengelola lab dan penetapan 12 metrik utama.'],
      ['Pipeline ingest', '2026-08-01', '2026-10-15', '2026-10-10', 'DAG Airflow untuk ekstraksi log harian, validasi skema, dan pemuatan ke gudang data.'],
      ['Pembangunan dashboard', '2026-10-16', '2026-12-15', null, 'Tiga dashboard di Superset: ringkasan harian, utilisasi perangkat, dan tren semester.'],
      ['Uji pengguna dan rilis', '2026-12-16', '2027-01-31', null, 'Uji coba bersama pengelola lab, perbaikan, lalu serah terima akses.'],
    ],
  },
  {
    name: 'Homelab Virtualisasi Proxmox',
    status: 'on_progress',
    description:
      'Membangun lingkungan virtualisasi bersama berbasis Proxmox VE agar anggota bisa membuat mesin virtual dan container untuk latihan tanpa memakai laptop pribadi.\n\nLingkungan ini dilengkapi kuota sumber daya per anggota, backup terjadwal ke Proxmox Backup Server, dan akses jarak jauh melalui VPN.',
    team: [2, 5, 8],
    // Satu tahap melewati target agar penanda "Terlambat" terlihat.
    stages: [
      ['Pengadaan server', '2026-06-01', '2026-06-30', '2026-07-12', 'Pengadaan dua server dan switch managed; pengiriman sempat tertunda dari pemasok.'],
      ['Instalasi cluster Proxmox', '2026-07-01', '2026-09-30', null, 'Cluster dua node, storage ZFS, serta pemisahan jaringan manajemen dan jaringan VM.'],
      ['Akses anggota dan backup', '2026-10-01', '2026-11-30', null, 'Akun per anggota dengan kuota, VPN WireGuard, dan backup harian.'],
      ['Dokumentasi dan pelatihan', '2026-12-01', '2026-12-31', null, 'Panduan membuat VM dan container, plus sesi pelatihan untuk anggota baru.'],
    ],
  },
  {
    name: 'Sistem Inventaris Aset Lab',
    status: 'done',
    description:
      'Aplikasi web untuk mencatat aset laboratorium: perangkat, lokasi, kondisi, dan riwayat peminjaman. Setiap aset diberi label QR sehingga pengecekan stok cukup dilakukan dengan memindai dari ponsel.\n\nSistem kini dipakai pengelola lab untuk stock opname tiap semester, menggantikan spreadsheet yang sebelumnya sering tidak sinkron.',
    team: [0, 2, 3, 6],
    stages: [
      ['Analisis kebutuhan', '2026-02-01', '2026-03-15', '2026-03-10', 'Pemetaan alur peminjaman dan stock opname bersama pengelola lab.'],
      ['Pengembangan aplikasi', '2026-03-16', '2026-06-30', '2026-06-25', 'Modul aset, peminjaman, label QR, dan laporan stok.'],
      ['Migrasi data', '2026-07-01', '2026-07-15', '2026-07-14', 'Pemindahan 640 data aset dari spreadsheet lama beserta pembersihan duplikat.'],
      ['Pelatihan pengguna', '2026-07-16', '2026-07-31', '2026-07-30', 'Pelatihan pengelola lab dan penyerahan dokumentasi operasional.'],
    ],
  },
  {
    name: 'Rewiring Jaringan Lab Riset',
    status: 'done',
    description:
      'Penataan ulang jaringan lab riset: segmentasi VLAN per fungsi, penggantian kabel lama, dan pemasangan access point baru. Sebelumnya seluruh perangkat berada dalam satu jaringan datar yang sulit dipantau.\n\nHasilnya, jaringan mahasiswa, server, dan perangkat IoT kini terpisah, dan lalu lintas jaringan bisa dipantau melalui LibreNMS.',
    team: [5, 6, 9],
    stages: [
      ['Survei dan desain topologi', '2026-03-01', '2026-03-31', '2026-03-29', 'Pemetaan port dan perangkat, lalu desain VLAN dan skema alamat IP.'],
      ['Pemasangan fisik', '2026-04-01', '2026-05-15', '2026-06-02', 'Penarikan kabel dan pemasangan rak; mundur dua minggu karena menunggu jadwal ruangan kosong.'],
      ['Konfigurasi dan monitoring', '2026-06-03', '2026-06-30', '2026-06-27', 'Konfigurasi switch, firewall antar-VLAN, dan instalasi LibreNMS.'],
    ],
  },
  {
    name: 'Kompetisi CTF Internal',
    status: 'cancelled',
    description:
      'Rencana kompetisi Capture The Flag internal dengan kategori web, forensik, kriptografi, dan reverse engineering, untuk melatih anggota sebelum mengikuti kompetisi nasional.\n\nProject dibatalkan karena jadwal pelaksanaan bentrok dengan masa ujian, dan sponsor infrastruktur menarik dukungannya. Soal yang sudah disusun disimpan untuk dipakai pada kegiatan berikutnya.',
    team: [1, 7, 8],
    stages: [
      ['Penyusunan soal', '2026-04-01', '2026-05-31', '2026-05-30', '24 soal dari empat kategori, masing-masing sudah diuji oleh dua anggota.'],
      ['Infrastruktur platform', '2026-06-01', '2026-07-31', null, 'Instalasi CTFd dan isolasi container per soal; terhenti di tengah pengerjaan.'],
      ['Pelaksanaan kompetisi', '2026-08-01', '2026-08-15', null, 'Kompetisi daring 48 jam untuk anggota dan mahasiswa umum.'],
    ],
  },
  {
    name: 'Aplikasi Presensi Kegiatan',
    status: 'cancelled',
    description:
      'Aplikasi presensi kegiatan klub berbasis QR dinamis untuk mencegah titip absen, dengan rekap kehadiran otomatis per anggota.\n\nProject dihentikan setelah kampus merilis sistem presensi resmi dengan fitur serupa, sehingga pengembangan terpisah tidak lagi diperlukan.',
    team: [3, 4, 10],
    stages: [
      ['Desain antarmuka', '2026-05-01', '2026-05-31', '2026-06-05', 'Wireframe dan prototipe Figma untuk alur pemindaian dan rekap.'],
      ['Pengembangan backend', '2026-06-01', '2026-08-31', null, 'API presensi dan pembangkit QR dinamis; dihentikan sebelum selesai.'],
    ],
  },
];

for (const [n, sample] of SAMPLE_PROJECTS.entries()) {
  const [project] = await db
    .insert(projects)
    .values({
      name: sample.name,
      slug: `contoh-${sample.name.toLowerCase().replaceAll(' ', '-')}`,
      description: sample.description,
      status: sample.status,
      isPublished: true,
      publishedAt: new Date(Date.now() - n * 3_600_000),
      githubUrl: 'https://github.com/',
      githubUrlVisible: true,
    })
    .returning();
  await db.insert(projectTimelineItems).values(
    sample.stages.map(([title, startDate, endDate, completedAt, description], i) => ({
      projectId: project.id,
      title,
      description,
      startDate,
      endDate,
      status: completedAt ? ('done' as const) : ('not_yet' as const),
      completedAt,
      sortOrder: i,
    })),
  );
  if (sample.team.length) await db.insert(projectMembers).values(sample.team.map((i) => ({ projectId: project.id, memberId: memberIds[i] })));
  if (sample.applicants?.length) {
    await db.insert(involvementRequests).values(sample.applicants.map((i) => ({ memberId: memberIds[i], projectId: project.id, note: 'Saya sudah terbiasa memakai Linux dan ingin belajar lebih dalam di project ini.' })));
  }
  if (sample.status === 'on_progress') {
    // Contoh pengajuan timeline dari anggota, menunggu keputusan komite.
    const [stage] = await db.select().from(projectTimelineItems).where(and(eq(projectTimelineItems.projectId, project.id), eq(projectTimelineItems.status, 'not_yet'))).limit(1);
    await db.insert(timelineRequests).values({ itemId: stage.id, memberId: memberIds[sample.team[0]], kind: 'dates', proposedStart: stage.startDate, proposedEnd: '2027-01-31', note: 'Tahap ini butuh waktu lebih lama karena menunggu perangkat dan jadwal lab; mohon perpanjangan.', evidenceUrl: 'https://github.com/' });
  }
}

/** Usulan project dari member: satu menunggu, satu diterima (sudah jadi project open), satu ditolak dengan feedback. */
const [committeeAccount] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.username, 'president'));

await db.insert(projectProposals).values({
  memberId: memberIds[6],
  name: 'Bot Discord Pengingat Kegiatan',
  description:
    'Bot Discord untuk server klub yang mengirim pengingat otomatis sebelum kegiatan, merangkum pengumuman mingguan, dan menyediakan perintah untuk melihat jadwal lab yang kosong.\n\nSaat ini pengingat dikirim manual oleh pengurus sehingga sering terlambat atau terlewat. Bot akan dijalankan di homelab klub dan membaca jadwal dari Google Calendar klub.',
  timeline: [
    { title: 'Rancangan perintah dan alur', description: 'Daftar perintah, format pesan pengingat, dan izin bot di server.', startDate: '2026-11-17', endDate: '2026-11-30' },
    { title: 'Integrasi kalender', description: 'Sinkronisasi Google Calendar dan penjadwal pengingat H-1 serta H-1 jam.', startDate: '2026-12-01', endDate: '2026-12-31' },
    { title: 'Uji coba di server klub', description: 'Uji coba dua minggu bersama pengurus sebelum dibuka untuk semua anggota.', startDate: '2027-01-04', endDate: '2027-01-17' },
  ],
});

const acceptedStages = [
  { title: 'Riset alat dan lingkungan uji', description: 'Membandingkan OWASP ZAP dan Nuclei, lalu menyiapkan aplikasi rentan (DVWA, Juice Shop) di homelab.', startDate: '2026-11-10', endDate: '2026-11-30' },
  { title: 'Pipeline pemindaian', description: 'Pemindaian terjadwal terhadap aplikasi internal lab dengan hasil yang dinormalisasi ke satu format.', startDate: '2026-12-01', endDate: '2027-01-15' },
  { title: 'Laporan dan triase', description: 'Laporan berprioritas untuk pengelola aplikasi dan panduan perbaikan temuan yang paling umum.', startDate: '2027-01-16', endDate: '2027-02-28' },
];
const [scanner] = await db
  .insert(projects)
  .values({
    name: 'Pemindai Kerentanan Web Lab',
    slug: 'contoh-pemindai-kerentanan-web-lab',
    description:
      'Pemindaian keamanan otomatis untuk aplikasi web internal laboratorium, menggabungkan OWASP ZAP dan Nuclei dalam satu pipeline terjadwal.\n\nTemuan diprioritaskan berdasarkan tingkat risiko dan dikirim ke pengelola aplikasi beserta saran perbaikannya. Project ini juga menjadi bahan latihan anggota bidang cybersecurity.',
    status: 'open',
    isPublished: true,
    publishedAt: new Date(),
  })
  .returning();
await db.insert(projectTimelineItems).values(acceptedStages.map((s, i) => ({ ...s, projectId: scanner.id, sortOrder: i })));
await db.insert(projectMembers).values({ projectId: scanner.id, memberId: memberIds[9] });
await db.insert(involvementRequests).values({ memberId: memberIds[4], projectId: scanner.id, note: 'Saya ingin belajar pentest web dan sudah pernah memakai Burp Suite.' });
await db.insert(projectProposals).values({
  memberId: memberIds[9],
  name: scanner.name,
  description: scanner.description,
  timeline: acceptedStages,
  status: 'approved',
  decidedBy: committeeAccount?.id ?? null,
  decidedAt: new Date(Date.now() - 86_400_000),
  decisionNote: 'Sesuai fokus cybersecurity klub. Pastikan pemindaian hanya ke aplikasi milik lab.',
  projectId: scanner.id,
});

await db.insert(projectProposals).values({
  memberId: memberIds[10],
  name: 'Aplikasi Marketplace Mahasiswa',
  description: 'Aplikasi jual beli barang bekas antarmahasiswa dengan fitur chat, pembayaran, dan ulasan penjual.',
  timeline: [
    { title: 'Desain aplikasi', description: 'Wireframe dan alur transaksi.', startDate: '2026-11-01', endDate: '2026-11-30' },
    { title: 'Pengembangan MVP', description: 'Katalog, chat, dan pembayaran.', startDate: '2026-12-01', endDate: '2027-02-28' },
  ],
  status: 'rejected',
  decidedBy: committeeAccount?.id ?? null,
  decidedAt: new Date(Date.now() - 2 * 86_400_000),
  decisionNote:
    'Di luar fokus tujuh bidang klub dan butuh pengelolaan transaksi yang tidak bisa kami dukung. Silakan ajukan ulang dengan fokus pada sisi infrastruktur atau keamanannya.',
});

/** Activity: dua sudah lewat dengan peserta, satu buka pendaftaran, satu belum dibuka. */
const SAMPLE_ACTIVITIES: { name: string; date: string; team: number[]; photos: number; registrationUrl?: string; registrationOpen?: boolean }[] = [
  { name: 'Contoh Workshop', date: '2026-09-12', team: [0, 1, 2, 3, 4, 5, 6, 7], photos: 5 },
  { name: 'Contoh Seminar Keamanan Siber', date: '2026-10-05', team: [2, 5, 8, 9, 10, 11], photos: 0 },
  { name: 'Contoh Bootcamp Linux', date: '2026-12-06', team: [], photos: 0, registrationUrl: 'https://join.theiofoundation.org/', registrationOpen: true },
  { name: 'Contoh Hackathon', date: '2027-02-20', team: [], photos: 0, registrationUrl: 'https://join.theiofoundation.org/', registrationOpen: false },
];

let seed = 0;
for (const sample of SAMPLE_ACTIVITIES) {
  const [activity] = await db
    .insert(activities)
    .values({
      name: sample.name,
      slug: sample.name.toLowerCase().replaceAll(' ', '-'),
      activityDate: sample.date,
      description: 'Ini adalah data contoh aktivitas.',
      isPublished: true,
      publishedAt: new Date(),
      registrationOpen: sample.registrationOpen ?? false,
      registrationUrl: sample.registrationUrl ?? null,
    })
    .returning();
  for (let i = 0; i < sample.photos; i++) {
    const key = await sampleImage(`${sample.name} ${i + 1}`, seed++);
    await db.insert(media).values({ purpose: 'gallery', kind: 'image', source: 'upload', storageKey: key, activityId: activity.id, sortOrder: i, isCover: i === 0 });
  }
  if (sample.team.length) await db.insert(activityMembers).values(sample.team.map((i) => ({ activityId: activity.id, memberId: memberIds[i] })));
}

for (let i = 0; i < 3; i++) {
  const key = await sampleImage(`Slide Contoh ${i + 1}`, seed++);
  const [item] = await db.insert(media).values({ purpose: 'carousel', kind: 'image', source: 'upload', storageKey: key, altText: `Slide contoh ${i + 1}` }).returning();
  await db.insert(carouselSlides).values({ mediaId: item.id, caption: `Slide contoh ${i + 1}`, sortOrder: i });
}

console.log(`Data contoh dibuat: ${PEOPLE.length} member, ${SAMPLE_PROJECTS.length + 1} project, 3 usulan project, ${SAMPLE_ACTIVITIES.length} aktivitas.`);
console.log(`Password semua member contoh: ${password}`);
await client.end();
