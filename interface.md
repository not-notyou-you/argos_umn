# Interface — Website Argos Club @ UMN

Spesifikasi tampilan untuk kebutuhan di [PRD.md](PRD.md). Rujukan brand: Argos Clubs Media Kit v1.0.

## 1. Arah desain

> Tampilan publik kini mengikuti arah **Editorial Tech**: header gelap, hero panel miring, judul ExtraBold, helmet SVG beranimasi (`src/components/helmet.tsx`), dan animasi tanpa library lewat CSS. Wireframe di bawah adalah rancangan awal; acuan akhirnya adalah kode.

**"Technical, open, proud of the work."** Website ini adalah portofolio komunitas teknologi. Karya dan orangnya menjadi tokoh utama, sedangkan brand menjadi bingkai.

Bahasa visualnya berasal dari logo helmet:

- **Bilah miring**, dari jambul helmet, untuk pemisah section dan aksen.
- **Geometri heksagon**, dari badan helmet, untuk avatar member.
- **Satu titik oranye**, dari visor, untuk elemen terpenting di setiap layar.

Website punya tema terang dan gelap. Tanpa pilihan pengguna, tema mengikuti sistem; pilihan disimpan di cookie `theme` dan dibaca server karena CSP melarang skrip inline. Hero, header, dan footer selalu gelap (`--ink`), sedangkan warna judul mengikuti tema lewat `--heading`. Saat memuat, halaman memakai `PageLoader` dan media memakai kelas `media-loading`: helmet idle dengan bilah berdenyut berurutan.

## 2. Design tokens

### Warna resmi

| Token | Hex | Pemakaian |
|---|---|---|
| `--brand-orange` | `#F79552` | CTA dan aksen |
| `--brand-light-blue` | `#66B5C5` | Aksen, teks pada latar gelap |
| `--brand-dark-blue` | `#50919F` | Ikon, garis, teks besar |
| `--brand-dark-gray` | `#4E5056` | Teks isi |
| `--brand-light-gray` | `#89898E` | Dekoratif, border |

### Warna pendukung

| Token | Hex | Pemakaian |
|---|---|---|
| `--ink` | `#1C1F24` | Judul, section gelap |
| `--surface` | `#FFFFFF` | Latar utama |
| `--surface-muted` | `#F6F8F9` | Latar section selang-seling |
| `--teal-text` | `#2F6D7A` | Tautan, tombol utama |
| `--orange-text` | `#A84E17` | Teks oranye pada latar terang |
| `--danger` | `#B3261E` | Error dan aksi hapus |

`--teal-text` dan `--orange-text` adalah turunan warna resmi agar lolos kontras (PRD A8).

### Aturan kontras

Rasio berikut sudah dihitung (AA: 4,5 untuk teks normal, 3 untuk teks besar/ikon).

| Warna | Pada putih | Pada `#F6F8F9` | Pada `#1C1F24` | Kesimpulan |
|---|---|---|---|---|
| `#F79552` | 2,24 | 2,10 | 7,38 | Jangan untuk teks di latar terang |
| `#66B5C5` | 2,34 | 2,20 | 7,07 | Hanya teks di latar gelap |
| `#50919F` | 3,56 | 3,35 | 4,64 | Di latar terang hanya teks besar/ikon |
| `#89898E` | 3,48 | 3,27 | 4,75 | Di latar terang hanya teks besar/ikon |
| `#4E5056` | 8,06 | 7,57 | 2,05 | Teks isi di latar terang |
| `#2F6D7A` | 5,85 | 5,49 | 2,82 | Tautan dan tombol di latar terang |
| `#A84E17` | 5,57 | 5,23 | 2,96 | Teks aksen di latar terang |

Tombol oranye selalu memakai teks `--ink` (7,38), bukan putih.

### Tipografi

Montserrat di-host sendiri dari `assets/`, dengan fallback `Helvetica, Arial, sans-serif`. Hanya tiga berat yang dimuat karena tersedia sebagai WOFF2: 400, 600, 700.

| Token | Desktop | Mobile | Berat |
|---|---|---|---|
| `display` | 56/64 | 36/44 | 700 |
| `h1` | 40/48 | 30/38 | 700 |
| `h2` | 30/38 | 24/32 | 700 |
| `h3` | 22/30 | 20/28 | 600 |
| `body` | 16/26 | 16/26 | 400 |
| `small` | 14/22 | 14/22 | 400 |
| `label` | 12/16 | 12/16 | 600, huruf besar, tracking 0.08em |

### Spasi, radius, dan layout

- Skala spasi: 4, 8, 12, 16, 24, 32, 48, 64, 96 px.
- Radius: 4 px (input, badge) dan 8 px (kartu). Gambar dan kartu tetap tegas, tidak terlalu membulat.
- Lebar konten maksimal 1200 px, gutter 16 px di mobile dan 32 px di desktop.
- Breakpoint: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Rasio media: kartu 16:10, carousel 21:9 (mobile 4:3).

### Logo

| Berkas di `assets/logos/` | Bentuk | Pemakaian |
|---|---|---|
| `argos-club-logo-fullcolor.png` | Helmet + ARGOS CLUBS | Hero di latar terang, halaman login, OG image |
| `argos-club-logo-text.png` | Sama, putih | Footer dan latar gelap |
| `argos-club-member-logo-fullcolor.png` | Helmet saja | Header, favicon |
| `argos-club-member-logo-text.png` | Helmet saja, putih | Header pada latar gelap |

Logo UMN ada di `assets/logos/umn/`, dengan sumber dan ukuran di [README-nya](assets/logos/umn/README.md).

| Berkas | Pemakaian |
|---|---|
| `official/umn-logo-header-grey.webp` | Footer dan section "Di bawah The IO Foundation". Perisainya aman di latar gelap |
| `official/umn-favicon-original.png` | Ikon kecil jika ruang terbatas. Bukan favicon website |

Logo UMN tidak dipakai di header dan tidak digabung dengan logo Argos. Beri jarak yang lapang, dan jangan mengubah warnanya. Berkas di `third-party/` tidak dipakai di website.

Berkas PNG Argos punya ruang kosong di sekelilingnya, sehingga butuh versi yang dipangkas tanpa mengubah bentuk logo. Dilarang mengubah warna, memutar, atau meregangkan logo.

## 3. Peta halaman

```
PUBLIK
/                       About Argos (landing)
/projects               Our Project
/projects/[slug]
/activities             Our Activity
/activities/[slug]
/members                Our Member
/members/[slug]
/galleries              The Galleries
/login

MEMBER
/me/profile             My Profile
/me/projects            My Project
/me/projects/[slug]
/account/password

COMMITTEE
/committee              Ringkasan
/committee/landing
/committee/projects     + /new, /[id]
/committee/activities   + /new, /[id]
/committee/members      + /new, /[id]
/committee/requests
/committee/system
/committee/audit
```

Versi Inggris memakai prefix `/en` hanya untuk halaman publik. Area member dan komite tidak memakai prefix; bahasanya disimpan di cookie. Pemilih bahasa tersedia di semua area.

## 4. Komponen utama

| Komponen | Spesifikasi |
|---|---|
| `Header` | Sticky, logo helmet + "Argos Club @ UMN", navigasi, pemilih ID/EN, tombol Login atau menu akun. Di mobile menjadi drawer |
| `Footer` | Latar `--ink`, logo putih, afiliasi TIOF, tautan resmi |
| `Button` | Varian primary (`--teal-text`), accent (oranye + `--ink`), secondary (outline), danger. Tinggi 44 px |
| `StatusBadge` | Selalu berteks. `done`: teal; `on progress`: oranye dengan teks `--orange-text`; `cancelled`: abu-abu |
| `ProjectCard`, `ActivityCard` | Media 16:10, logo kecil, nama, ringkasan 2 baris, badge/tanggal |
| `MemberCard` | Foto heksagon, nama, jurusan, angkatan, posisi terkini |
| `MediaGrid` | Foto utama besar, thumbnail, dan video jika ada. Bagian kosong tidak ditampilkan |
| `CoverPlaceholder` | Latar `--ink`, bilah miring, dan helmet putih. Dipakai jika tidak ada foto utama |
| `Lightbox` | Navigasi panah, keyboard, swipe, tutup dengan Esc |
| `VideoFacade` | Thumbnail + tombol play; embed baru dimuat setelah diklik |
| `MediaManager` | Area foto (drag & drop, urutkan, pilih foto utama, penghitung `n/10`) dan area video (`n/1`) |
| `Toggle` | Untuk tombol project dan pengaturan privasi |
| `ConfirmDialog` | Aksi hapus wajib mengetik nama item |
| `DataTable` | Cari, filter, urut; berubah menjadi daftar kartu di mobile |
| `EmptyState` | Ikon, satu kalimat, satu aksi |

Ikon memakai Lucide, kecuali logo GitHub.

## 5. Halaman publik

### 5.1 About Argos (`/`)

```
┌──────────────────────────────────────────────────────────┐
│ ◆ Argos Club @ UMN   Beranda Project Aktivitas Member    │
│                      Galeri            ID|EN  [Login]    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│     CAROUSEL FOTO (21:9), overlay gradasi --ink          │
│                                                          │
│     Belajar teknologi. Bangun karya berdampak.           │
│     [Lihat Project]  [Gabung]                            │
│                              ‹  ● ○ ○ ○  ›               │
├──────────────────────────────────────────────────────────┤
│ TENTANG                                                  │
│ Apa itu Argos Club @ UMN?            [foto kegiatan]     │
│ Penjelasan singkat untuk orang awam                      │
├──────────────────────────────────────────────────────────┤
│ FOKUS KAMI                                               │
│ Fokus utama Argos Clubs                                  │
│ [HPC] [AI] [Virtualisasi] [Keamanan Siber] [Jaringan]    │
│ Fokus tambahan UMN                                       │
│ [Big Data] [ERP]                                         │
├──────────────────────────────────────────────────────────┤
│ DI BAWAH THE IO FOUNDATION                               │
│ Penjelasan TIOF dan jaringan Argos Clubs                 │
├──────────────────────────────────────────────────────────┤
│ PROJECT TERBARU                       Lihat semua →      │
│ [kartu] [kartu] [kartu]                                  │
├──────────────────────────────────────────────────────────┤
│ AKTIVITAS TERBARU                     Lihat semua →      │
│ [kartu] [kartu] [kartu]                                  │
├──────────────────────────────────────────────────────────┤
│ Mau bergabung?                     [Daftar via TIOF ↗]   │
├──────────────────────────────────────────────────────────┤
│ FOOTER                                                   │
└──────────────────────────────────────────────────────────┘
```

- Carousel berganti tiap 6 detik, berhenti saat hover/fokus, punya tombol jeda, dan tidak bergerak otomatis jika `prefers-reduced-motion`.
- Jika belum ada slide, tampilkan hero `--ink` dengan logo putih.
- Headline di atas adalah contoh. Teks akhir dari komite.

### 5.2 Our Project

```
Our Project
[Semua] [On Progress] [Done] [Cancelled]          [Cari...]

┌────────────┐ ┌────────────┐ ┌────────────┐
│ media 16:10│ │            │ │            │
├────────────┤ ├────────────┤ ├────────────┤
│ ◇ Nama     │ │            │ │            │
│ Ringkasan  │ │            │ │            │
│ [● Done]   │ │            │ │            │
└────────────┘ └────────────┘ └────────────┘
```

### 5.3 Detail project

```
← Our Project
◇ Nama Project                    [● On Progress]

┌──────────────────────────┐   [Open Project ↗]
│   FOTO UTAMA / VIDEO     │   [Open GitHub ↗]
│                          │   [Open Documentation ↗]
└──────────────────────────┘
[t] [t] [t] [t] [t] [t] [t]    ANGGOTA
                               ⬡ Nama
TENTANG PROJECT                ⬡ Nama
Deskripsi...                   ⬡ Nama
```

Kolom tombol hilang jika tidak ada tombol yang aktif. Di mobile, tombol berada di bawah media. Jika ada foto dan video, foto utama tampil paling atas dan video berada di bawah thumbnail. Jika tidak ada foto, area utama memakai `CoverPlaceholder`, dan video tampil di bawahnya.

### 5.4 Our Activity

Sama seperti Our Project, tetapi tanpa status dan tombol. Daftar dikelompokkan per tahun, dengan tanggal di kartu.

### 5.5 Our Member

```
Our Member
[Onboarded (24)] [Offboarded (6)]      [Cari] [Angkatan ▾]

  ⬡        ⬡        ⬡        ⬡
 Nama     Nama     Nama     Nama
 Informatika 2024  ...
 President
```

Kartu tidak menampilkan data yang disembunyikan member, dan layout tetap rapi. Foto yang disembunyikan diganti inisial di dalam heksagon.

### 5.6 Detail member

```
⬡ FOTO    Nama Lengkap              [Onboarded]
          Informatika · Angkatan 2024

RIWAYAT POSISI
● President        Agu 2026 – Jul 2027
○ Vice President   Feb 2026 – Jul 2026

PROJECT            AKTIVITAS
[kartu kecil]      [kartu kecil]
```

### 5.7 The Galleries

Grid masonry dengan filter Semua, Project, Aktivitas. Lightbox menampilkan keterangan dan tautan "Lihat project/aktivitas". Item dimuat bertahap dengan tombol "Muat lebih banyak".

## 6. Halaman member

Area login memakai layout dengan sidebar (desktop) atau tab bawah (mobile). Tautan Committee hanya muncul jika punya akses.

### 6.1 Login

Logo di tengah, username, password, dan tombol Masuk. Tautan "Lupa password? Hubungi komite." tidak memerlukan alur email. Pesan gagal selalu generik: "Username atau password salah." Jika password benar tetapi member sudah offboarded, tampilkan "Akunmu sudah tidak aktif. Hubungi komite."

Akun dengan password sementara langsung diarahkan ke halaman ganti password. Setelah login, akun seeder menuju `/committee`, sedangkan member menuju `/me/profile`.

### 6.2 My Profile

```
PROFIL                              TAMPILKAN DI OUR MEMBER
⬡ [Ganti foto]                      Nama            selalu
Nama     [______________]           Foto            [on ]
Jurusan  [______________]           Jurusan         [on ]
Angkatan [____]                     Angkatan        [on ]
                       [Simpan]     Posisi          [on ]
                                    Aktivitas       [on ]
                                    Project         [on ]

KETERLIBATAN (dikelola komite)      [+ Ajukan keterlibatan]
Project A · Aktivitas B

REQUEST SAYA
Project C    Menunggu
Aktivitas D  Ditolak: "alasan"

[Lihat profil publik ↗]  [Ganti password]
```

Form request berisi jenis, pilihan project/aktivitas, dan catatan. Item yang sudah diikuti tidak muncul sebagai pilihan.

Di dekat pengaturan tampilan diberi catatan: nama tetap muncul di halaman project/aktivitas yang diikuti.

### 6.3 My Project

Daftar kartu project milik member, dengan tombol Edit. Form edit:

```
Status: [● On Progress]  🔒 diatur komite
Anggota: Nama, Nama      🔒 diatur komite

Nama       [_______________]
Logo       [Ganti]
Deskripsi  [_______________]

MEDIA (opsional)
Foto   [MediaManager]  7/10, foto utama sudah dipilih
Video  [+ Upload / Tautan]  0/1

TOMBOL
Open Project        [on ] [https://...]
Open GitHub         [on ] [https://...]
Open Documentation  [off] [https://...]

                               [Batal] [Simpan]
```

Field terkunci ditampilkan sebagai teks, bukan input yang dinonaktifkan.

## 7. Panel Committee

```
┌───────────────┬──────────────────────────────────────┐
│ ◆ Committee   │ Member                [+ Tambah]     │
│               │                                      │
│ Ringkasan     │ [Cari] [Status ▾] [Angkatan ▾]       │
│ Landing Page  │ ┌──────────────────────────────────┐ │
│ Project       │ │ Nama   Angkatan  Posisi   Status │ │
│ Aktivitas     │ │ ...                              │ │
│ Member        │ └──────────────────────────────────┘ │
│ Request (3)   │                                      │
│ Akun Sistem   │                                      │
│ Audit Log     │                                      │
└───────────────┴──────────────────────────────────────┘
```

| Halaman | Isi |
|---|---|
| **Ringkasan** | Jumlah request menunggu, project/aktivitas draft, dan perubahan terbaru |
| **Landing Page** | Tab Carousel (urutan drag, aktif/nonaktif, alt text) dan Teks About |
| **Project** | Tabel + form seperti §6.3 ditambah status, anggota, publikasi, hapus |
| **Aktivitas** | Tabel + form, ditambah tanggal, anggota, publikasi, hapus |
| **Member** | Tabel + detail dengan tab Profil, Posisi, Keterlibatan, Akun, serta dialog kelola daftar posisi |
| **Request** | Antrean dengan tombol Setujui/Tolak; alasan penolakan opsional |
| **Akun Sistem** | Empat akun seeder, ganti password; tanpa tombol hapus |
| **Audit Log** | Daftar hanya baca, bisa difilter |

Tab **Posisi** memakai pemilih bulan: posisi, bulan mulai, dan bulan selesai. Bulan selesai wajib untuk President, Vice President, dan Secretary. Teks bantuan: "Akses komite berlaku sampai akhir bulan selesai."

Jika project atau aktivitas belum punya foto, tombol **Publikasikan** menampilkan peringatan "Akan memakai cover placeholder", tetapi publikasi tetap bisa dilakukan.

Saat komite meng-offboard member, dialog menegaskan bahwa member langsung tidak bisa login dan sesi aktifnya terputus.

Password sementara ditampilkan sekali dalam dialog dengan tombol salin dan peringatan bahwa nilainya tidak bisa dilihat lagi.

## 8. Status layar

| Status | Perilaku |
|---|---|
| Memuat | Skeleton mengikuti bentuk konten, bukan spinner layar penuh |
| Kosong | `EmptyState`. Publik: "Belum ada project." Komite: disertai tombol tambah |
| Error form | Pesan di bawah field dan ringkasan di atas; isian tidak hilang |
| Upload | Progress per file, bisa dibatalkan dan dicoba ulang |
| Berhasil | Toast singkat, `aria-live="polite"` |
| 403 | "Halaman ini khusus komite." + tautan kembali |
| 404 | Pesan ramah + tautan ke beranda |
| Server mati | Halaman pemeliharaan dari Worker, ID + EN, satu berkas tanpa aset eksternal |

## 9. Aksesibilitas

- Target WCAG 2.2 AA, kontras mengikuti §2.
- Semua fungsi bisa memakai keyboard, dengan fokus terlihat 2 px `--teal-text` (`--brand-orange` di latar gelap).
- Ada tautan "Lewati ke konten".
- Status tidak pernah hanya dibedakan lewat warna.
- Komponen drag punya alternatif tombol naik/turun.
- Semua media punya alt text; foto tanpa alt text memakai nama project/aktivitas sebagai cadangan.
- Target sentuh minimal 44 × 44 px.
- Animasi mengikuti `prefers-reduced-motion`.
- Atribut `lang` mengikuti bahasa UI.

## 10. Bahasa dan teks UI

Kamus UI berada di `messages/id.json` dan `messages/en.json`. Konten dari database tampil apa adanya.

| Kunci | ID | EN |
|---|---|---|
| `nav.home` | Beranda | Home |
| `nav.projects` | Project | Projects |
| `nav.activities` | Aktivitas | Activities |
| `nav.members` | Member | Members |
| `nav.galleries` | Galeri | Galleries |
| `project.open` | Open Project | Open Project |
| `project.github` | Open GitHub | Open GitHub |
| `project.docs` | Open Documentation | Open Documentation |
| `status.done` | Done | Done |
| `status.onProgress` | On Progress | On Progress |
| `status.cancelled` | Cancelled | Cancelled |
| `member.onboarded` | Onboarded | Onboarded |
| `member.offboarded` | Offboarded | Offboarded |

Gaya bahasa santai, jelas, dan ramah orang awam. Sapa pembaca dengan "kamu".

## 11. Footer resmi

- Teks: "Argos Club @ UMN is part of the Argos Clubs by The IO Foundation."
- Logo Argos putih dan logo UMN berdampingan, dengan label "Host university: Universitas Multimedia Nusantara".
- Tautan: TheIOFoundation.org/Argos-Clubs, Community.TheIOFoundation.org/Argos-Clubs, join.theiofoundation.org.
- Tagar opsional: `#ArgosClubs`, `#WeAreArgonauts`, `#TechUpCommunity`.
- Handle sosial mengikuti format resmi `@ArgosClub.{ISO3}.{Kode Host}`; handle UMN harus dikonfirmasi sebelum dicantumkan.
