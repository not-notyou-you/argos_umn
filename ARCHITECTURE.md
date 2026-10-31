# Architecture — Website Argos Club @ UMN

Dokumen ini menjelaskan cara membangun kebutuhan di [PRD.md](PRD.md). Tampilan ada di [interface.md](interface.md).

## 1. Gambaran sistem

Server Argos hanya bisa dijangkau dari WiFi Argos UMN, jadi tidak ada port masuk yang dibuka. `cloudflared` membuat koneksi **keluar** ke Cloudflare, dan semua trafik publik masuk lewat koneksi tersebut.

```
Pengunjung
    │ HTTPS
    ▼
Cloudflare Worker  ──(server mati)──▶ Halaman pemeliharaan
argos-umn.<akun>.workers.dev
    │ Workers VPC binding
    ▼
Cloudflare Tunnel
    ▲ koneksi keluar (QUIC, UDP 7844)
    │
┌───┴──── Server Argos (WiFi Argos UMN) ─────────┐
│  Docker Compose                                │
│                                                │
│  cloudflared ──▶ app (Next.js) ──▶ db (Postgres)│
│                    │                           │
│                    ▼                           │
│              volume media         backup (cron)│
└────────────────────────────────────────────────┘
```

## 2. Keputusan teknis

| Komponen | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Satu aplikasi untuk publik, member, dan komite; dukungan SSR |
| Database | **PostgreSQL** | Relasi kuat, mudah dibackup, cocok self-host |
| ORM | **Drizzle** | Migrasi berupa SQL yang bisa dibaca dan ringan |
| Style | **Tailwind CSS** | Token desain dari interface.md |
| i18n | **next-intl** | ID di `/`, EN di `/en` |
| Validasi | **Zod** | Skema sama untuk form dan server |
| Auth | **Sesi sendiri + Argon2id** | Hanya butuh username/password, tanpa OAuth atau email |
| Gambar | **sharp** | Resize, WebP, dan penghapusan EXIF |
| Media | **Disk lokal (volume Docker)** | Tanpa layanan tambahan |
| Deploy | **Docker Compose** | Pindah server cukup salin volume dan `.env` |

Versi dependensi dikunci di `package-lock.json` saat Tahap 1, memakai rilis stabil terbaru pada saat itu.

## 3. Strategi akses publik

| Fase | Jalur | URL | Status |
|---|---|---|---|
| **A. Tanpa domain (utama)** | Worker + Workers VPC + Tunnel | `*.workers.dev`, tetap | Beta, gratis |
| **B. Cadangan** | Worker + Quick Tunnel | `*.workers.dev`, tetap | Hanya sementara |
| **C. Dengan domain** | Tunnel dengan public hostname | Domain sendiri | Permanen |

### Fase A — utama

Worker memanggil aplikasi lewat binding Workers VPC, sehingga aplikasi tidak punya hostname publik selain Worker.

- Butuh `cloudflared` ≥ 2025.7.0 dengan protokol QUIC dan UDP keluar port 7844.
- Workers VPC masih beta. Pemakaian tanpa public hostname pada akun gratis belum tertulis eksplisit di dokumentasi, sehingga **harus dibuktikan di Tahap 0**.

### Fase B — cadangan

Jika Workers VPC gagal, tetapi TCP/UDP 7844 bisa keluar, jalankan Quick Tunnel dan biarkan Worker meneruskan request ke URL `trycloudflare.com` yang disimpan di KV. Skrip di server memperbarui KV setiap kali URL berubah.

Batasan: Quick Tunnel resmi hanya untuk pengujian, tanpa jaminan uptime, maksimal 200 request berjalan, tanpa SSE, dan URL berganti setiap restart. Di fase ini server wajib menolak request tanpa header rahasia dari Worker, karena URL Quick Tunnel bersifat publik.

### Fase C — domain

1. Tambahkan domain ke Cloudflare.
2. Tambahkan public hostname ke tunnel, arahkan ke `http://app:3000`.
3. Ubah `PUBLIC_BASE_URL` dan restart aplikasi.
4. Ubah Worker lama agar mengalihkan permanen ke domain baru.

Kode dan database tidak berubah karena path media disimpan relatif. Semua sesi lama perlu login ulang karena domain cookie berubah.

### Batasan Cloudflare yang memengaruhi desain

| Batasan (paket gratis) | Dampak |
|---|---|
| 100.000 request Worker per hari | Semua aset ikut terhitung; andalkan cache browser. Melewati batas menghasilkan Error 1027 |
| CPU Worker 10 ms per request | Worker hanya meneruskan stream, jangan memproses body |
| Body request maks. 100 MB | Batas upload video di aplikasi 95 MB |
| Cache API di `workers.dev` belum terkonfirmasi | Jangan mengandalkan cache edge pada fase A; cukup `Cache-Control` |

### Syarat Worker

- Meneruskan method, body, dan header secara stream.
- Mengisi `X-Forwarded-Host`, `X-Forwarded-Proto`, dan `X-Forwarded-For` dari `CF-Connecting-IP`.
- Menampilkan halaman pemeliharaan untuk `GET` halaman jika origin gagal atau membalas 502–504.
- `X-Forwarded-Host` wajib sama dengan host publik, karena Next.js memakainya untuk memverifikasi origin Server Action. Daftar origin tidak dikunci saat build, sehingga pindah domain tidak perlu build ulang.

## 4. Data model

Semua tabel memakai `id` UUID serta `created_at` dan `updated_at`, kecuali disebut lain.

```
accounts 1──0..1 members 1──* member_positions *──1 positions
                    │
                    ├──* project_members  *──1 projects   1──* media
                    ├──* activity_members *──1 activities 1──* media
                    └──* involvement_requests

carousel_slides *──1 media
```

### accounts

| Kolom | Tipe | Catatan |
|---|---|---|
| username | text unik | Login |
| password_hash | text | Argon2id |
| must_change_password | bool | True untuk password sementara |
| kind | enum `system`, `member` | |
| system_role | enum `president`, `vice_president`, `secretary`, null | Wajib jika `system` |
| is_active | bool | |
| last_login_at | timestamptz null | |

Akun `kind = system` tidak boleh dihapus, dinonaktifkan, atau diganti username-nya. Selain validasi aplikasi, pasang trigger database penolak `DELETE`.

### members

| Kolom | Tipe | Catatan |
|---|---|---|
| account_id | FK unik | |
| slug | text unik | Tetap setelah dibuat |
| full_name | text | |
| major | text | Jurusan |
| cohort | int | Angkatan |
| photo_media_id | FK media null | |
| status | enum `onboarded`, `offboarded` | Hanya komite |
| show_photo, show_major, show_cohort, show_positions, show_activities, show_projects | bool | Default true |

Akun seeder tidak punya baris `members`, sehingga otomatis tidak muncul di OUR MEMBER.

### positions dan member_positions

`positions`: `name` unik, `grants_committee` bool, `is_locked` bool, `sort_order`.

Seed (semua terkunci): President, Vice President, Secretary (`grants_committee = true`), serta Treasurer, IT Admin, Comms, dan Member. Komite bisa menambah posisi baru, tetapi `grants_committee` tidak bisa diubah dari UI sehingga posisi baru tidak memberi akses komite.

`member_positions`: `member_id`, `position_id`, `start_date`, `end_date` null.

UI memakai pemilih bulan. Server menormalkan `start_date` ke hari pertama bulan dan `end_date` ke hari terakhir bulan, lalu membandingkannya dengan tanggal hari ini menurut `Asia/Jakarta`. `end_date` wajib untuk posisi `grants_committee`.

### projects dan activities

Kolom bersama: `slug`, `name`, `logo_media_id`, `description`, `is_published`, `published_at`.

Khusus `projects`:

- `status` enum `done`, `on_progress`, `cancelled`, default `on_progress`
- `project_url`, `project_url_visible`
- `github_url`, `github_url_visible`
- `docs_url`, `docs_url_visible`

Khusus `activities`: `activity_date` date (tambahan dari rancangan, dibutuhkan untuk pengurutan).

Join table `project_members` dan `activity_members` memakai primary key gabungan.

### media

| Kolom | Tipe | Catatan |
|---|---|---|
| purpose | enum `gallery`, `logo`, `avatar`, `carousel` | |
| kind | enum `image`, `video` | |
| source | enum `upload`, `drive`, `youtube` | |
| storage_key | text null | Path relatif file lokal |
| external_id | text null | ID Drive/YouTube, bukan URL mentah |
| project_id, activity_id | FK null | CHECK: maksimal satu terisi |
| is_cover | bool | Partial unique index per project/aktivitas |
| sort_order | int | |
| alt_text | text null | |
| width, height, bytes, mime | | |

### Tabel lain

- **involvement_requests:** `member_id`, `project_id`/`activity_id` (tepat satu), `note`, `status` (`pending`, `approved`, `rejected`), `decided_by`, `decided_at`, `decision_note`. Unique parsial untuk mencegah request `pending` ganda.
- **site_content:** `key` unik, `value` jsonb, `updated_by`. Teks About.
- **carousel_slides:** `media_id`, `caption`, `link_url`, `sort_order`, `is_active`.
- **sessions:** `token_hash`, `account_id`, `expires_at`, `last_seen_at`.
- **login_attempts:** `username`, `ip`, `attempted_at`, `succeeded`.
- **audit_logs:** `actor_account_id`, `action`, `entity_type`, `entity_id`, `changes` jsonb, `created_at`. Hanya bisa ditambah.

## 5. Auth dan otorisasi

- **Sesi:** token acak 256-bit, hanya hash yang disimpan. Cookie `HttpOnly`, `Secure`, `SameSite=Lax`, masa aktif 7 hari bergulir; panel komite tidak butuh sesi terpisah.
- **Offboarding:** dalam satu transaksi, status diubah dan semua baris `sessions` milik akun dihapus. Setiap request juga memeriksa status member sebagai pengaman kedua.
- **Batas login (15 menit):** 5 gagal per pasangan username + IP, 20 per username, dan 30 per IP. Pasangan username + IP mencegah penyerang mengunci akun orang lain. IP dibaca dari `CF-Connecting-IP`.
- **Password:** minimal 12 karakter, dicek terhadap daftar password umum.
- **Password sementara:** dibuat acak dan hanya ditampilkan sekali.
- **Pemulihan seeder:** perintah `npm run account:reset -- <username>` dari layanan `tools`.
- **Form:** login dan ganti password tetap berjalan tanpa JavaScript, dan form lain memakai POST, sehingga password tidak pernah masuk URL.

Setiap Server Action dan route memakai helper di `lib/auth`:

```ts
requireAccount()                 // semua area login
requireMember()                  // /me/*
requireProjectMember(projectId)  // edit project sendiri
requireCommittee()               // /committee/*
```

`requireAccount()` dan `requireCommittee()` membaca status dan posisi dari database pada setiap request, bukan dari isi sesi. Inilah yang membuat offboarding dan akhir masa jabatan berlaku tepat waktu.

Skema Zod member untuk edit project **tidak memuat** `status`, `is_published`, atau daftar anggota. Komite memakai skema terpisah.

## 6. Media

| Jenis | Format | Batas | Proses |
|---|---|---|---|
| Foto | JPEG, PNG, WebP | 10 MB, 40 megapiksel | Cek magic bytes, hapus EXIF, buat WebP 480/960/1600 px |
| Logo | PNG, WebP | 2 MB | Sama, tanpa SVG untuk mencegah XSS |
| Video upload | MP4 (H.264/AAC), WebM | 95 MB | Dilayani dengan HTTP Range |
| YouTube | URL `youtube.com`, `youtu.be` | — | Simpan ID, embed `youtube-nocookie.com` setelah diklik |
| Drive video | URL Drive | — | Simpan ID, embed `/preview` setelah diklik |
| Drive foto | URL Drive | Dibagikan publik | Server mengunduh salinan lalu memprosesnya seperti upload |

Setiap project atau aktivitas menampung maksimal 10 foto dan 1 video; batas ini divalidasi di server dan keduanya opsional. Tanpa foto utama, UI memakai placeholder statis, bukan baris `media`.

Video lebih dari 95 MB dianjurkan memakai YouTube.

- Foto Drive disalin ke server karena tautan gambar langsung dari Drive tidak stabil. Jalur unduhannya tidak resmi, jadi kegagalan harus ditangani dengan pesan yang jelas.
- Untuk mencegah SSRF, server hanya menerima ID hasil parsing dan membentuk sendiri URL Drive/YouTube.
- Nama file memakai hash konten, dilayani dari `/media/*` dengan `Cache-Control: public, max-age=31536000, immutable`.
- File yang tidak lagi direferensikan dibersihkan dengan `npm run media:clean`, disarankan seminggu sekali.

## 7. Keamanan

- Semua perubahan divalidasi di server dengan Zod.
- `/api/upload` menolak origin lain, karena route handler tidak mendapat pemeriksaan origin bawaan Server Action.
- CSP dibuat di `src/proxy.ts` dengan nonce baru pada setiap request, tanpa `unsafe-inline` pada `script-src`. `frame-src` hanya `youtube-nocookie.com` dan `drive.google.com`.
- HSTS dikirim saat `PUBLIC_BASE_URL` memakai HTTPS.
- Deskripsi disimpan sebagai teks/Markdown terbatas dan disanitasi saat render.
- URL tombol project hanya menerima `http` dan `https`.
- Kontainer `db` tidak punya port ke host dan berada di jaringan `internal`, sehingga `cloudflared` tidak bisa menjangkaunya.
- Rahasia hanya ada di `.env` server, tidak pernah masuk repo.
- Jika repo dipublikasikan, pastikan tidak ada data member atau kredensial di dalamnya.
- Regresi pen test ada di `tests/e2e/security.spec.ts`.

### Risiko yang diterima

| Risiko | Alasan | Pengendali |
|---|---|---|
| Sesama komite bisa saling mengubah posisi dan me-reset password | Kebutuhan peran komite | Audit log, seeder hanya bisa di-reset seeder |
| Tanpa 2FA | Klub tidak punya layanan email; dipertimbangkan setelah rilis | Password panjang, batas login |
| Serangan dari banyak IP bisa memicu batas 20 per username | Batas keras itu yang menahan brute force terdistribusi | Berakhir sendiri setelah 15 menit |
| Backup terenkripsi masih di server yang sama | Lokasi tujuan belum ditentukan | Wajib disalin ke luar server sebelum rilis |

## 8. Deployment

Layanan Docker Compose:

| Layanan | Peran |
|---|---|
| `app` | Next.js output `standalone`, port internal 3000 |
| `db` | PostgreSQL dengan volume `pgdata` |
| `cloudflared` | Tunnel, memakai `TUNNEL_TOKEN` |
| `backup` | Job harian |
| `tools` | Perintah sekali jalan: migrasi, seed, reset akun, pembersihan media |

Semua layanan memakai `restart: unless-stopped`, dengan healthcheck `/api/health`.

Perkiraan awal spesifikasi: 2 vCPU, 4 GB RAM, dan 100 GB disk, diutamakan pada VM tersendiri. Nilai ini perlu disesuaikan dengan server Argos yang sebenarnya.

### Backup

- `pg_dump` dan arsip media setiap hari, dienkripsi AES-256 dengan `BACKUP_PASSPHRASE`.
- Simpan 7 harian dan 4 mingguan.
- Salinan terenkripsi harus berada **di luar server utama**, karena satu disk bukan backup.
- Lakukan uji restore sebelum rilis dan setiap awal semester.

### Validasi Tahap 0

Jalankan dari server, berurutan:

1. Pastikan Docker berjalan dan server punya akses internet keluar.
2. Jalankan `cloudflared tunnel --url http://localhost:8080` terhadap server uji, lalu buka URL-nya dari jaringan lain.
3. Paksa `--protocol quic`, lalu `--protocol http2`, dan catat keduanya.
4. Buat Tunnel bernama, Worker, dan binding Workers VPC; akses dari jaringan lain.

| Hasil | Keputusan |
|---|---|
| QUIC berhasil, Workers VPC berhasil | Fase A |
| QUIC atau HTTP/2 berhasil, Workers VPC gagal | Fase B, segera siapkan domain |
| Hanya HTTP/2 berhasil | Fase B atau C (Workers VPC butuh QUIC) |
| Keduanya gagal | Minta IT UMN membuka port 7844 keluar |

## 9. Pengujian

| Lapisan | Alat | Fokus |
|---|---|---|
| Unit | Vitest | Aturan akses, validasi media, parsing URL |
| Integrasi | Vitest + Postgres | Server Action, request keterlibatan, proteksi seeder |
| E2E | Playwright | Kriteria penerimaan di PRD |
| Aksesibilitas | axe + Playwright | WCAG 2.2 AA |

Wajib punya test matriks akses: setiap kombinasi peran × area, termasuk offboarded, hari terakhir dan hari setelah bulan selesai (WIB), serta sesi yang masih aktif saat di-offboard.

## 10. Sumber Cloudflare

- [Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/)
- [Tunnel dan firewall](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers VPC: Tunnel](https://developers.cloudflare.com/workers-vpc/configuration/tunnel/)
- [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
