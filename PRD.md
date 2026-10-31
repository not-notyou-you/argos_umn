# PRD — Website Argos Club @ UMN

| | |
|---|---|
| **Versi** | 0.3 (Tahap 1–4 selesai secara lokal, deployment belum) |
| **Tanggal** | 31 Oktober 2026 |
| **Sumber** | `rancangan.md`, keputusan pemilik proyek, riset publik The IO Foundation |
| **Dokumen terkait** | [interface.md](interface.md) · [ARCHITECTURE.md](ARCHITECTURE.md) · [README.md](README.md) |

---

## 1. Latar belakang

Argos Clubs adalah komunitas mahasiswa berbasis universitas yang dibentuk oleh **The IO Foundation (TIOF)** sebagai bagian dari jaringan TechUp Community. TIOF adalah NGO global yang memperjuangkan *Data-Centric Digital Rights* (DCDR).

Argos Club @ UMN adalah klub pertama, diluncurkan pada **13 Februari 2026** bersama Fakultas Teknik & Informatika UMN. Klub ini memiliki lab dan server sendiri.

Halaman UMN di microsite TIOF saat ini masih kosong ("Stay tuned"). Akibatnya, belum ada tempat publik yang menampilkan project, aktivitas, dan anggota klub, padahal portofolio yang bisa diverifikasi adalah salah satu nilai utama Argos Clubs.

## 2. Tujuan

| # | Tujuan | Indikator keberhasilan |
|---|---|---|
| G1 | Orang awam memahami apa itu Argos Club @ UMN | Pengunjung baru bisa menjawab "ini klub apa dan apa kegiatannya" dari halaman utama saja |
| G2 | Project dan aktivitas terdokumentasi rapi | Semua project dan aktivitas sejak Februari 2026 masuk ke website dalam 1 bulan setelah rilis |
| G3 | Member punya portofolio publik | Minimal 80% member onboarded melengkapi profil dalam 1 bulan setelah rilis |
| G4 | Komite mengelola semua konten tanpa developer | Landing, project, aktivitas, dan member bisa diubah dari panel |

## 3. Pengguna dan hak akses

| Peran | Siapa | Akses |
|---|---|---|
| **Publik** | Siapa pun, tanpa login | Semua halaman publik |
| **Member** | Onboarded dan punya akun buatan komite | Publik + MY PROFILE + MY PROJECT |
| **Komite** | Akun seeder, atau member onboarded yang memegang posisi President, Vice President, atau Secretary | Member (jika terikat member) + panel Committee |

### Aturan akun (keputusan pemilik proyek)

1. Tidak ada pendaftaran mandiri. Semua akun dibuat oleh komite.
2. Akun baru selalu berposisi **Member**. Komite bisa menambah atau mengubah posisinya.
3. Ada 4 akun seeder: **President, Vice President, Secretary 1, dan Secretary 2**.
4. Akun seeder tidak bisa dihapus, tidak terikat data member, dan tidak muncul di OUR MEMBER.
5. Akun seeder bisa dipakai berdampingan dengan member yang memegang posisi sama. Satu jabatan boleh diakses oleh dua akun.
6. Member **offboarded** tidak bisa login sama sekali, walaupun masih dalam masa jabatan. Sesi aktifnya langsung berakhir.
7. Jika member di-onboard kembali, akunnya bisa login lagi.

### Aturan akses komite

```
bisaLogin(akun) =
    akun aktif
    DAN (akun seeder ATAU status member = onboarded)

aksesKomite(akun) =
    bisaLogin(akun)
    DAN (akun seeder ATAU punya posisi pemberi akses yang sedang berlaku)
```

Posisi pemberi akses adalah President, Vice President, dan Secretary. Posisi "sedang berlaku" jika hari ini, menurut WIB, berada di antara hari pertama bulan mulai dan hari terakhir bulan selesai.

Contoh: Vice President Jan 2025 – Jun 2025, lalu President Jul 2025 – Jul 2025. Akses komitenya berlaku dari 1 Januari sampai 31 Juli 2025, kecuali di-offboard lebih dulu.

Aturan dievaluasi di server pada setiap request, sehingga perubahan status berlaku seketika.

## 4. Ruang lingkup

### Termasuk di v1

Seluruh halaman dalam `rancangan.md`, UI dua bahasa (ID/EN), akun buatan komite, upload media, tautan Drive/YouTube, sistem request, audit log, dan backup.

### Tidak termasuk di v1

| Hal | Alasan |
|---|---|
| Pendaftaran member lewat website | Pendaftaran resmi ada di join.theiofoundation.org; website cukup menautkannya |
| Notifikasi email | Klub tidak memiliki layanan email; reset password dilakukan komite |
| Terjemahan konten | Konten ditulis satu bahasa oleh penginputnya |
| Fitur realtime, komentar, atau chat | Tidak dibutuhkan dan jalur tunnel perlu dijaga sederhana |
| Sertifikat, kalender, dan statistik pengunjung | Di luar rancangan; analytics juga bertentangan dengan prinsip minim pelacakan |
| Login SSO atau Google | Pemilik proyek memilih akun buatan komite |

## 5. Kebutuhan fungsional — Publik

### 5.1 About Argos (halaman utama `/`)

- **FR-P1** Menampilkan carousel foto yang dikelola komite.
- **FR-P2** Menjelaskan untuk orang awam: apa itu Argos Club @ UMN, hubungannya dengan TIOF, tujuan, dan kegiatannya.
- **FR-P2a** Menampilkan fokus utama Argos Clubs (high-performance computing, AI, virtualisasi, keamanan siber, jaringan) dan fokus tambahan UMN (**Big Data dan ERP**).
- **FR-P3** Semua teks bisa diubah komite.
- **FR-P4** Menampilkan cuplikan project dan aktivitas terbaru, serta tautan bergabung ke join.theiofoundation.org.

### 5.2 Our Project

- **FR-P5** Daftar project yang sudah dipublikasikan, bisa difilter berdasarkan status.
- **FR-P6** Detail project menampilkan nama, logo, deskripsi, status, anggota yang terlibat, dan media.
- **FR-P7** Status hanya salah satu dari `done`, `on progress`, `cancelled`.
- **FR-P8** Ada tiga tombol: **Open Project**, **Open GitHub**, **Open Documentation**. Setiap tombol hanya muncul jika diaktifkan dan URL-nya terisi.

### 5.3 Our Activity

- **FR-P9** Daftar aktivitas yang sudah dipublikasikan, diurutkan dari tanggal terbaru.
- **FR-P10** Detail aktivitas menampilkan nama, logo, tanggal, deskripsi, anggota yang terlibat, dan media.

### 5.4 Our Member

- **FR-P11** Daftar member dengan tab **Onboarded** dan **Offboarded**.
- **FR-P12** Detail member menampilkan foto, nama, jurusan, angkatan, riwayat posisi (nama dan tanggal), aktivitas, dan project, sesuai pengaturan privasinya. Nama selalu tampil.
- **FR-P13** Akun seeder tidak pernah muncul.

### 5.5 The Galleries

- **FR-P14** Menggabungkan otomatis semua foto dan video dari project dan aktivitas yang dipublikasikan.
- **FR-P15** Bisa difilter (Semua, Project, Aktivitas), dan setiap item menautkan ke sumbernya.

### 5.6 Aturan media (project dan aktivitas)

- **FR-M1** Foto dan video bersifat opsional dan boleh digabung: maksimal **10 foto** dan **1 video**. Disarankan 5–10 foto agar halaman terlihat lengkap.
- **FR-M2** Sumber media: upload langsung, tautan Google Drive, atau tautan YouTube (khusus video).
- **FR-M3** Jika ada foto, tepat satu menjadi foto utama. Foto pertama otomatis terpilih.
- **FR-M3a** Jika tidak ada foto, cover memakai **placeholder**, termasuk ketika hanya ada video.
- **FR-M4** Tautan Drive harus dibagikan publik. Jika gagal diakses, form menampilkan pesan yang jelas.

Batas file ada di [ARCHITECTURE.md](ARCHITECTURE.md#6-media).

## 6. Kebutuhan fungsional — Member

### 6.1 My Profile

- **FR-M5** Mengubah foto, nama, jurusan, dan angkatan.
- **FR-M6** Mengatur data apa yang tampil di OUR MEMBER: foto, jurusan, angkatan, posisi, aktivitas, project.
- **FR-M7** Tidak bisa mengubah posisi, status, atau daftar keterlibatan.
- **FR-M8** Bisa mengirim **request keterlibatan** ke project atau aktivitas yang belum tercatat, lalu melihat statusnya (menunggu, disetujui, ditolak).
- **FR-M9** Bisa mengganti password. Password sementara wajib diganti saat login pertama.

### 6.2 My Project

- **FR-M10** Menampilkan project tempat member terdaftar.
- **FR-M11** Semua anggota project bisa mengubah nama, logo, deskripsi, media, dan ketiga tombol.
- **FR-M12** **Status dan daftar anggota hanya bisa diubah komite.** Server harus mengabaikan kedua field ini pada request member.
- **FR-M14** Member tidak bisa membuat, menghapus, atau mengatur publikasi project.

## 7. Kebutuhan fungsional — Committee

### 7.1 Landing Page

- **FR-C1** Mengubah seluruh teks About Argos.
- **FR-C2** CRUD carousel: tambah, hapus, urutkan, aktif/nonaktif, dan alt text.

### 7.2 Project Management

- **FR-C3** CRUD project, termasuk status, daftar anggota, draft/publikasi.
- **FR-C4** Menghapus project membutuhkan konfirmasi dengan mengetik namanya.

### 7.3 Activity Management

- **FR-C5** CRUD aktivitas, termasuk daftar anggota dan draft/publikasi.

### 7.4 Member Management

- **FR-C6** CRUD member. Membuat member sekaligus membuat akun, posisi default Member, dan password sementara yang hanya ditampilkan sekali.
- **FR-C7** Mengatur status onboarded/offboarded. Offboarding langsung memutus semua sesi dan memblokir login. Karena member offboarded tidak bisa login, perubahan datanya dilakukan komite.
- **FR-C8** Mengelola banyak posisi per member, masing-masing dengan nama, bulan mulai, dan bulan selesai. Bulan selesai wajib untuk posisi pemberi akses dan boleh kosong untuk posisi lain.
- **FR-C8a** Mengelola daftar posisi. Awalnya: President, Vice President, Secretary, Treasurer, IT Admin, Comms, Member. Posisi baru **tidak** memberi akses komite. Posisi bawaan tidak bisa dihapus, dan posisi tambahan hanya bisa dihapus jika belum dipakai.
- **FR-C9** Reset password member, aktifkan/nonaktifkan akun.
- **FR-C10** Menyetujui atau menolak request keterlibatan. Persetujuan otomatis menambahkan member ke project/aktivitas.

### 7.5 Tambahan yang diperlukan

Dua hal ini tidak ada di rancangan, tetapi dibutuhkan agar sistem aman:

- **FR-C11 Akun sistem:** mengganti password akun seeder. Seeder hanya bisa di-reset oleh akun seeder lain atau lewat perintah CLI di server.
- **FR-C12 Audit log:** mencatat siapa mengubah apa dan kapan untuk semua aksi komite, karena banyak akun bisa memegang hak yang sama.

## 8. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| **Hosting** | Berjalan di server Argos UMN, diakses publik lewat Cloudflare |
| **Portabilitas** | Pindah ke domain sendiri cukup lewat konfigurasi, tanpa perubahan kode atau migrasi data |
| **Keandalan** | Saat server/tunnel mati, pengunjung melihat halaman pemeliharaan yang ramah; backup harian |
| **Performa** | Halaman publik LCP < 2,5 detik pada koneksi 4G; gambar dikonversi ke WebP dan responsif |
| **Bahasa** | UI ID (default) dan EN |
| **Aksesibilitas** | WCAG 2.2 AA |
| **Responsif** | Dari lebar 360 px sampai desktop |
| **Keamanan** | Password Argon2id, RBAC di server, batas percobaan login, validasi upload, CSP |
| **Privasi** | Tanpa pelacak pihak ketiga, font di-host sendiri, EXIF dihapus, embed YouTube/Drive baru dimuat setelah diklik. Data member mengikuti UU No. 27/2022 (PDP) dan semangat DCDR |

## 9. Kepatuhan brand TIOF

Media Kit Argos Clubs v1.0 berlaku:

- Font Montserrat, cadangan Helvetica lalu Arial.
- Palet resmi lima warna (detail di [interface.md](interface.md)).
- Logo full color untuk penggunaan umum, logo putih untuk latar gelap.
- Footer mencantumkan afiliasi dengan The IO Foundation, tautan kanal resmi, dan logo UMN sebagai host university.

## 10. Rencana rilis

| Tahap | Isi | Syarat selesai |
|---|---|---|
| **0. Validasi infrastruktur** | Uji koneksi keluar server, Docker, Tunnel, Worker | Halaman uji bisa dibuka dari luar WiFi Argos |
| **1. Fondasi** | Skeleton, database, seeder, login, RBAC, i18n, design system | Seeder login dan middleware akses teruji |
| **2. Publik** | Semua halaman publik dengan data contoh | Bisa ditinjau komite |
| **3. Committee** | Landing, Project, Activity, Member, media pipeline | Komite bisa mengisi semua konten |
| **4. Member** | My Profile, My Project, request | Alur request berjalan penuh |
| **5. Rilis** | Backup, audit keamanan, isi konten, uji aksesibilitas | Backup berhasil dipulihkan dan kriteria di bawah terpenuhi |
| **6. Domain** | Pindah ke domain sendiri saat tersedia | Tanpa perubahan kode |

**Tahap 0 wajib dilakukan lebih dulu**, karena jaringan kampus bisa memblokir port keluar yang dibutuhkan Tunnel.

### Kriteria penerimaan v1

- [ ] Website bisa diakses dari luar kampus, tanpa WiFi Argos.
- [ ] Empat akun seeder tersedia, tidak bisa dihapus, tidak muncul di OUR MEMBER.
- [ ] Member baru otomatis berposisi Member dan wajib mengganti password.
- [ ] Member yang diberi posisi President bisa membuka panel Committee.
- [ ] Akses komite berakhir otomatis setelah bulan selesai posisi berlalu.
- [ ] Member yang di-offboard langsung tidak bisa login, dan sesi aktifnya terputus.
- [ ] Request langsung ke server tidak bisa mengubah status atau anggota project dengan akun member.
- [ ] Project dan aktivitas menerima maksimal 10 foto + 1 video, dan menampilkan placeholder jika tidak ada foto.
- [ ] Tombol project yang dinonaktifkan tidak muncul.
- [ ] Permintaan keterlibatan yang disetujui langsung tampil di profil publik.
- [ ] Mematikan server menampilkan halaman pemeliharaan, bukan error Cloudflare.
- [ ] Backup berhasil dipulihkan ke lingkungan kosong.

## 11. Keputusan dan hal terbuka

### Keputusan yang sudah dikonfirmasi

| # | Topik | Keputusan |
|---|---|---|
| A1 | Akun seeder | Total **4 akun**: President, Vice President, Secretary 1, Secretary 2 |
| A2 | Masa jabatan | Posisi tercatat per bulan. Akses komite berlaku sampai akhir bulan selesai dan hanya selama member onboarded |
| A3 | Media | Foto dan video boleh digabung dan keduanya opsional. Tanpa foto utama, cover memakai placeholder |
| A4 | Offboarded | Tidak bisa login sama sekali. Profil publiknya tetap tampil di tab Offboarded |
| A5 | Fokus klub | Fokus utama Argos Clubs tetap berlaku, ditambah **Big Data dan ERP** khusus UMN |
| A6 | Nama | "Argos Club @ UMN" aman dipakai |
| A7 | Logo | Logo helmet aman dipakai di header dan favicon |
| A8 | Warna | Warna turunan untuk teks aman dipakai |
| A9 | Logo UMN | Wajib ditampilkan sebagai host university, memakai berkas resmi dari umn.ac.id |

## 12. Risiko utama

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Jaringan kampus memblokir port 7844 | Website tidak bisa diakses publik | Uji di Tahap 0; jika gagal, minta izin ke IT UMN |
| Server/listrik/jaringan kampus mati | Website tidak bisa diakses | Halaman pemeliharaan di Worker, restart otomatis |
| Workers VPC masih beta | Perilaku atau harga bisa berubah | Quick Tunnel sebagai cadangan sementara; domain sendiri sebagai solusi permanen |
| Kerusakan disk server | Data hilang | Backup harian ke lokasi terpisah, uji restore |
| Foto/data pribadi member tersebar | Masalah privasi | Pengaturan tampil, hapus EXIF, tanpa pelacak |
| Pengurus berganti | Kredensial atau pengetahuan hilang | Runbook di README, serah terima akun seeder saat pergantian kepengurusan |

## 13. Referensi

- [Argos Clubs Media Kit](https://community.theiofoundation.org/argos-clubs/about/media-kit)
- [Argos Clubs Project Information](https://community.theiofoundation.org/argos-clubs/about/project-information)
- [Argos Clubs Spotlight](https://community.theiofoundation.org/argos-clubs/about/spotlight)
- [Argos Club Launch — UMN](https://community.theiofoundation.org/activities/current-season/season-2026/02-february/tiof-argos-club-launch-hard-umn)
- [Berita UMN, Februari 2026](https://www.umn.ac.id/?p=66223)
- [TIOF Organization Brief](https://discover.theiofoundation.org/the-io-foundation/about/organization-brief)
