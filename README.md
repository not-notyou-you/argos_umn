# Argos Club @ UMN — Website

Website resmi komunitas Argos Club di Universitas Multimedia Nusantara, bagian dari [Argos Clubs by The IO Foundation](https://community.theiofoundation.org/argos-clubs).

Website ini menampilkan profil klub, project, aktivitas, member, dan galeri, serta menyediakan area untuk member dan komite.

> **Status:** aplikasi sudah berjalan secara lokal dan lolos pengujian otomatis. Belum dideploy ke server Argos. Docker Compose dan Tunnel belum diuji, dan konten asli belum diisi.

## Dokumen

| Dokumen | Isi |
|---|---|
| [PRD.md](PRD.md) | Tujuan, kebutuhan, aturan akun, tahapan, keputusan, risiko |
| [interface.md](interface.md) | Design token, komponen, wireframe, aksesibilitas |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, tunnel, data model, keamanan, deployment |
| [rancangan.md](rancangan.md) | Rancangan awal |

## Teknologi

Next.js 16, TypeScript, PostgreSQL, Drizzle, Tailwind CSS, next-intl, Docker Compose, Cloudflare Tunnel, dan Cloudflare Workers.

## Struktur direktori

```
.
├── assets/               Sumber brand: logo, font, palet
├── messages/             Kamus UI id.json dan en.json
├── public/brand/         Logo yang sudah dioptimalkan
├── scripts/              Backup
├── src/
│   ├── actions/          Server Action
│   ├── app/
│   │   ├── [locale]/     Halaman publik
│   │   ├── me/           Area member
│   │   └── committee/    Panel komite
│   ├── components/
│   ├── db/               Skema, migrasi, seeder
│   ├── i18n/
│   └── lib/              Auth, aturan akses, media
├── tests/                Unit dan E2E
├── worker/               Cloudflare Worker dan halaman pemeliharaan
├── compose.yaml
└── Dockerfile
```

## Menjalankan lokal

Prasyarat: Node.js 22 atau lebih baru, dan PostgreSQL.

```bash
cp .env.example .env      # isi DATABASE_URL dan empat password seeder
createdb argos_umn
npm install
npm run db:migrate
npm run db:seed
npm run db:demo           # opsional: data contoh, password dicetak sekali
npm run dev
```

Buka http://localhost:3000. Login komite memakai username `president`, `vice-president`, `secretary-1`, atau `secretary-2` dengan password dari `.env`. Password wajib diganti saat login pertama.

## Pengujian

```bash
npm run typecheck
npm test                    # unit test aturan akses dan parsing tautan
npx playwright install chromium
createdb argos_umn_test
npm run build
npm run test:e2e            # skenario penerimaan pada build standalone
```

E2E menghapus isi database `argos_umn_test` setiap kali dijalankan. Atur `TEST_DATABASE_URL` jika koneksinya berbeda.

## Variabel lingkungan

| Variabel | Fungsi |
|---|---|
| `PUBLIC_BASE_URL` | URL publik; satu-satunya nilai aplikasi yang berubah saat pindah domain |
| `DATABASE_URL` | Koneksi PostgreSQL |
| `MEDIA_DIR` | Lokasi penyimpanan media |
| `SEED_PRESIDENT_PASSWORD` | Password awal akun President |
| `SEED_VICE_PRESIDENT_PASSWORD` | Password awal akun Vice President |
| `SEED_SECRETARY_1_PASSWORD` | Password awal akun Secretary 1 |
| `SEED_SECRETARY_2_PASSWORD` | Password awal akun Secretary 2 |
| `POSTGRES_PASSWORD` | Password database di Docker Compose |
| `TUNNEL_TOKEN` | Token Cloudflare Tunnel |
| `ORIGIN_SHARED_SECRET` | Header rahasia dari Worker; wajib pada Quick Tunnel |

Jangan pernah melakukan commit berkas `.env`.

## Deployment

Server Argos hanya bisa diakses dari WiFi Argos UMN, sehingga akses publik melewati Cloudflare. Tidak ada port masuk yang dibuka. Jalankan dulu [validasi Tahap 0](ARCHITECTURE.md#validasi-tahap-0).

Rilis pertama:

```bash
docker compose build
docker compose run --rm tools npm run db:migrate
docker compose run --rm tools npm run db:seed
docker compose up -d
```

Worker dideploy dari folder `worker/` setelah `wrangler.jsonc` diisi:

```bash
cd worker
npx wrangler deploy
```

Pembaruan:

```bash
git pull
docker compose build
docker compose run --rm tools npm run db:migrate
docker compose up -d
```

Detail fase tanpa domain dan dengan domain ada di [ARCHITECTURE.md](ARCHITECTURE.md#3-strategi-akses-publik).

## Operasional

| Kejadian | Tindakan |
|---|---|
| Website tidak bisa diakses | Dari WiFi Argos, cek `docker compose ps` dan `docker compose logs cloudflared` |
| Member lupa password | Komite reset dari Member Management |
| Semua password seeder hilang | Di server: `docker compose run --rm tools npm run account:reset -- <username>` |
| Pergantian kepengurusan | Atur posisi member dan ganti password keempat akun seeder |
| Bersihkan media tak terpakai | `docker compose run --rm tools npm run media:clean` |

### Backup dan restore

Layanan `backup` menyimpan database dan media ke `./backups` setiap hari. Folder itu masih berada di server yang sama, jadi salin ke lokasi lain.

Restore:

```bash
docker compose stop app
docker compose exec -T db pg_restore -U argos -d argos_umn --clean --if-exists < backups/daily/db-TANGGAL.dump
docker compose run --rm -v "$PWD/backups:/backups" tools tar -xzf /backups/daily/media-TANGGAL.tar.gz -C /data
docker compose up -d
```

## Brand

Ikuti [Argos Clubs Media Kit v1.0](https://community.theiofoundation.org/argos-clubs/about/media-kit). Aset ada di `assets/`, dan aturan pemakaian di [interface.md](interface.md).

Font Montserrat memakai lisensi SIL Open Font License. Logo dan identitas Argos Clubs adalah milik The IO Foundation. Logo UMN adalah milik Universitas Multimedia Nusantara.

## Lisensi

Belum ditentukan. Karena Open Source adalah salah satu Guiding Principles TIOF, pilih lisensi kode sebelum repositori dipublikasikan.
