# Panduan Deploy dan Update Website Argos Club @ UMN

Panduan ini menjelaskan cara memasang website Argos di server Proxmox milik The IO Foundation dan cara memperbaruinya. Ditulis untuk pembaca yang belum terbiasa dengan server. Ikuti urutannya dan salin perintah persis seperti tertulis.

## Daftar isi

1. [Gambaran singkat](#1-gambaran-singkat)
2. [Yang perlu disiapkan](#2-yang-perlu-disiapkan)
3. [Istilah yang dipakai](#3-istilah-yang-dipakai)
4. [Deploy pertama kali](#4-deploy-pertama-kali)
5. [Update kode saja](#5-update-kode-saja)
6. [Menyamakan isi server dengan laptop](#6-menyamakan-isi-server-dengan-laptop)
7. [Perintah sehari-hari](#7-perintah-sehari-hari)
8. [Masalah yang pernah terjadi](#8-masalah-yang-pernah-terjadi)

---

## 1. Gambaran singkat

```
Pengunjung
   │  https://argos-umn.hakimhakim.workers.dev   (alamat tetap)
   ▼
Cloudflare Worker  ── membaca alamat tunnel terbaru dari KV
   │  menambahkan header rahasia
   ▼
Quick Tunnel  (https://xxxx.trycloudflare.com, alamat bisa berganti)
   ▼
Server Argos: LXC 112 "argos" di Proxmox, IP 192.168.0.118
   ├─ app     website Next.js, hanya terbuka di 127.0.0.1:3000
   ├─ db      PostgreSQL
   └─ backup  backup terenkripsi harian
```

- Server hanya bisa dijangkau dari **WiFi Argos UMN**. Pengunjung dari internet masuk lewat Cloudflare, jadi tidak ada port yang perlu dibuka.
- Alamat Quick Tunnel berubah setiap tunnel restart. Karena itu ada skrip penjaga di server yang setiap menit mengirim alamat terbaru ke Cloudflare. Pengunjung selalu memakai alamat Worker yang tetap.
- Aplikasi menolak permintaan yang tidak membawa header rahasia (`ORIGIN_SHARED_SECRET`). Jadi alamat `trycloudflare.com` tidak bisa dipakai langsung, dan hasil `403 Forbidden` di sana adalah tanda **sehat**.

## 2. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Laptop tersambung WiFi Argos UMN | Wajib untuk SSH ke server |
| Akun Proxmox | Untuk membuat container (LXC) |
| Akses repo GitHub `not-notyou-you/argos_umn` | Untuk menambah deploy key |
| Akun Cloudflare | Yang memiliki subdomain `hakimhakim.workers.dev` |
| Node.js 22 di laptop | Untuk menjalankan `wrangler` (deploy Worker) |
| Password manager | Untuk menyimpan isi `.env` server |
| Izin The IO Foundation | Pastikan pemakaian server sudah diizinkan |

## 3. Istilah yang dipakai

| Istilah | Arti sederhana |
|---|---|
| **LXC / CT** | "Komputer kecil" di dalam server Proxmox |
| **SSH** | Cara masuk ke terminal server dari laptop |
| **Docker / Compose** | Alat yang menjalankan website, database, dan backup sebagai "kotak" terpisah |
| **Tunnel** | Jalur dari server ke Cloudflare, supaya website bisa dibuka dari internet |
| **Worker** | Program kecil di Cloudflare yang memberi alamat tetap |
| **KV** | Tempat penyimpanan kecil di Cloudflare, berisi alamat tunnel terbaru |
| **`.env`** | File berisi password dan rahasia. **Jangan pernah dibagikan atau di-commit** |

Penanda di awal setiap blok perintah menunjukkan tempat menjalankannya:

- **[Laptop]**: PowerShell di Windows
- **[Server]**: terminal SSH (`notnot@argos:~$`)
- **[Console]**: menu Console di halaman Proxmox

---

## 4. Deploy pertama kali

Bagian ini hanya dilakukan sekali. Kalau server sudah jalan, lompat ke [bagian 5](#5-update-kode-saja).

### 4.1 Kirim kode terbaru ke GitHub

Server mengambil kode dari GitHub, bukan dari laptop.

**[Laptop]**
```powershell
cd D:\NOT-NOTYOU-YOU\argos_umn
git add -A
git status
git commit -m "Siap deploy"
git push origin main
```

Pastikan `.env` **tidak** muncul di daftar `git status`.

### 4.2 Buat container di Proxmox

Di halaman Proxmox, klik **Create CT**, lalu isi:

| Tab | Isian |
|---|---|
| General | Hostname `argos`, Resource Pool `Hakim.Ulinnuha`, centang **Unprivileged** dan **Nesting**, isi password root |
| Template | `ubuntu-24.04-standard` |
| Disks | 50 GB (bisa diperbesar nanti, tidak bisa diperkecil) |
| CPU | 2 core |
| Memory | 4096 MB, swap 2048 MB |
| Network | IPv4 **DHCP**, IPv6 **SLAAC**, Firewall boleh dimatikan |
| DNS | DNS servers: `1.1.1.1 8.8.8.8` |

Klik **Finish**, lalu **Start**.

### 4.3 Siapkan user dan SSH

> **Penting:** di Console Proxmox, teks yang ditempel sering mendapat tambahan `~` di akhir sehingga perintah gagal. Di Console, **ketik perintah secara manual**. Setelah SSH jalan, menempel perintah aman.

**[Console]** (login sebagai `root`)
```bash
apt update && apt -y upgrade
apt -y install openssh-server
adduser notnot
usermod -aG sudo notnot
ip -4 a show eth0
```

Catat IP di baris `inet` (contoh: `192.168.0.118`). IP ini dari DHCP dan bisa berubah. Kalau SSH gagal suatu hari, cek ulang dengan perintah terakhir.

**[Laptop]**
```powershell
ssh notnot@192.168.0.118
```

Ketik `yes` jika ditanya, lalu password `notnot`. Kalau password ditolak padahal yakin benar, ketik ulang password di Console dengan `passwd notnot`.

### 4.4 Pasang Docker dan cloudflared

**[Server]**
```bash
sudo apt -y install curl git openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker notnot
curl -L --retry 5 -o /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i /tmp/cloudflared.deb
exit
```

SSH masuk lagi (agar izin Docker aktif), lalu cek:

**[Server]**
```bash
docker run --rm hello-world
cloudflared --version
```

Berhasil jika muncul `Hello from Docker!` dan nomor versi cloudflared.

### 4.5 Ambil kode dari GitHub

**[Server]**
```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

Salin **satu baris terakhir** yang diawali `ssh-ed25519` dan diakhiri `notnot@argos`. Ini kunci publik, aman dibagikan. Jangan salin isi file tanpa `.pub`.

Buka GitHub repo, lalu **Settings → Deploy keys → Add deploy key**:
- Title: `proxmox-ct112`
- Key: tempel baris tadi
- **Allow write access: jangan dicentang**

**[Server]**
```bash
sudo mkdir -p /opt/argos && sudo chown $USER /opt/argos
git clone git@github.com:not-notyou-you/argos_umn.git /opt/argos
cd /opt/argos
git log --oneline -3
```

Ketik `yes` jika ditanya soal `github.com`. Commit paling atas harus sama dengan commit terakhir di laptop.

### 4.6 Buat file rahasia `.env`

Semua password dibuat acak otomatis.

**[Server]**
```bash
cd /opt/argos
cat > .env <<EOF
PUBLIC_BASE_URL=https://argos-umn.hakimhakim.workers.dev
SEED_PRESIDENT_PASSWORD=$(openssl rand -hex 16)
SEED_VICE_PRESIDENT_PASSWORD=$(openssl rand -hex 16)
SEED_SECRETARY_1_PASSWORD=$(openssl rand -hex 16)
SEED_SECRETARY_2_PASSWORD=$(openssl rand -hex 16)
POSTGRES_PASSWORD=$(openssl rand -hex 24)
BACKUP_PASSPHRASE=$(openssl rand -hex 32)
ORIGIN_SHARED_SECRET=$(openssl rand -hex 32)
TUNNEL_TOKEN=tidak-dipakai
EOF
chmod 600 .env
cat .env
```

Salin hasil `cat .env` ke password manager. **`BACKUP_PASSPHRASE` wajib disimpan di luar server**, karena tanpa itu backup tidak bisa dipulihkan. `TUNNEL_TOKEN` hanya pengisi agar Docker Compose mau berjalan.

### 4.7 Buat file pengaturan khusus server

File ini hanya ada di server, tidak ada di GitHub. Isinya:
- membuka website hanya untuk server sendiri (`127.0.0.1:3000`);
- membuat pemeriksaan kesehatan ikut membawa header rahasia (tanpa ini, `app` dianggap tidak sehat);
- mematikan `cloudflared` versi Docker, karena tunnel dijalankan langsung di server.

**[Server]**
```bash
cat > compose.override.yaml <<'EOF'
services:
  app:
    ports: ["127.0.0.1:3000:3000"]
    healthcheck:
      test: ['CMD', 'node', '-e', "fetch('http://127.0.0.1:3000/api/health',{headers:{'x-origin-secret':process.env.ORIGIN_SHARED_SECRET}}).then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
  cloudflared:
    profiles: [nonaktif]
EOF
```

Tidak ada pesan apa pun setelahnya berarti berhasil.

### 4.8 Jalankan website

Jalankan **satu baris per satu**, tunggu selesai, baru lanjut. Build pertama bisa 5 sampai 15 menit.

**[Server]**
```bash
docker compose build
docker compose run --rm tools npm run db:migrate
docker compose run --rm tools npm run db:seed
docker compose up -d
```

Tunggu 1 menit, lalu cek:

**[Server]**
```bash
docker compose ps
curl -i http://127.0.0.1:3000/api/health
```

Yang benar:
- `argos-app-1` dan `argos-db-1` berstatus **healthy**;
- `curl` menjawab **`403 Forbidden`** (tanda header rahasia bekerja).

### 4.9 Isi konten awal (opsional)

Database baru masih kosong. Untuk mengisi project, aktivitas, dan foto contoh:

**[Server]**
```bash
docker compose run --rm tools npm run db:content
docker compose exec -u root app chown -R argos /data/media
docker compose restart app
```

Foto dari skrip ini **sementara** dan disebar acak. Ganti lewat panel komite sebelum website dipromosikan. Untuk memakai isi persis dari laptop, lihat [bagian 6](#6-menyamakan-isi-server-dengan-laptop).

### 4.10 Pasang Cloudflare Worker

**[Laptop]**
```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\node-v22.23.4-win-x64;$env:Path"
cd D:\NOT-NOTYOU-YOU\argos_umn\worker
npx wrangler login
npx wrangler whoami
npx wrangler kv namespace create argos-umn-config
```

Jika wrangler bertanya:
- *Add it on your behalf?* → **yes**
- *What binding name?* → ketik **`CONFIG`** (huruf besar, persis begini; nama lain membuat Worker tidak bisa membaca alamat)

Periksa isi `worker/wrangler.jsonc` dan pastikan ada `"binding": "CONFIG"` beserta `id` KV-nya. Lalu:

**[Laptop]**
```powershell
npx wrangler deploy
npx wrangler secret put ORIGIN_SHARED_SECRET
```

Untuk secret, tempel nilai yang didapat dari perintah ini, ambil hanya bagian setelah tanda `=`:

**[Server]**
```bash
grep ORIGIN_SHARED_SECRET /opt/argos/.env
```

Catat alamat `https://...workers.dev` dari hasil deploy. Jika berbeda dari `argos-umn.hakimhakim.workers.dev`, ubah `PUBLIC_BASE_URL` di `.env` server dengan alamat yang **sebenarnya** (jangan menyalin contoh mentah-mentah), lalu `docker compose up -d`.

### 4.11 Buat API token Cloudflare

Buka https://dash.cloudflare.com/profile/api-tokens, lalu **Create Token → Custom token**:
- Token name: `argos-kv`
- Permissions: `Account` · `Workers KV Storage` · `Edit`
- Account Resources: `Include` · akun Anda

Salin token yang muncul. Token hanya ditampilkan sekali.

Siapkan juga:
- **Account ID**: dari hasil `npx wrangler whoami`
- **KV ID**: dari `worker/wrangler.jsonc`

### 4.12 Pasang tunnel dan penjaga alamat

**[Server]**
```bash
sudo tee /etc/argos-cf.env >/dev/null <<'EOF'
CF_ACCOUNT_ID=ISI_ACCOUNT_ID
CF_KV_ID=ISI_KV_ID
CF_TOKEN=ISI_TOKEN
EOF
sudo chmod 600 /etc/argos-cf.env
sudo nano /etc/argos-cf.env
```

Di `nano`, ganti tiga nilai `ISI_...`. Simpan dengan `Ctrl+O`, Enter, lalu keluar dengan `Ctrl+X`.

Tempel seluruh blok berikut sekaligus:

**[Server]**
```bash
sudo tee /etc/systemd/system/argos-tunnel.service >/dev/null <<'EOF'
[Unit]
Description=Quick Tunnel Argos
After=network-online.target docker.service
Wants=network-online.target
[Service]
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

sudo tee /usr/local/bin/perbarui-alamat-argos >/dev/null <<'EOF'
#!/bin/bash
set -u
source /etc/argos-cf.env
ID=$(systemctl show -p InvocationID --value argos-tunnel)
URL=$(journalctl _SYSTEMD_INVOCATION_ID="$ID" -o cat --no-pager | grep -a -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
[ -n "$URL" ] || exit 0
if [ "$URL" != "$(cat /run/argos-alamat 2>/dev/null)" ]; then
  curl -fsS -m 20 -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/storage/kv/namespaces/$CF_KV_ID/values/origin_url" \
    -H "Authorization: Bearer $CF_TOKEN" -H 'Content-Type: text/plain' --data "$URL" >/dev/null \
    && echo "$URL" > /run/argos-alamat
fi
# Tunnel sehat membalas 403 karena permintaan ini tidak membawa header rahasia.
KODE=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "$URL/api/health")
MULAI=$(date -d "$(systemctl show -p ActiveEnterTimestamp --value argos-tunnel)" +%s)
if { [ "$KODE" = 530 ] || [ "$KODE" = 000 ]; } && [ $(( $(date +%s) - MULAI )) -gt 180 ]; then
  systemctl restart argos-tunnel
fi
EOF
sudo chmod 700 /usr/local/bin/perbarui-alamat-argos

sudo tee /etc/systemd/system/perbarui-alamat-argos.service >/dev/null <<'EOF'
[Service]
Type=oneshot
ExecStart=/usr/local/bin/perbarui-alamat-argos
EOF

sudo tee /etc/systemd/system/perbarui-alamat-argos.timer >/dev/null <<'EOF'
[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now argos-tunnel perbarui-alamat-argos.timer
```

Tunggu 2 menit, lalu cek:

**[Server]**
```bash
sudo /usr/local/bin/perbarui-alamat-argos
cat /run/argos-alamat
systemctl is-active argos-tunnel perbarui-alamat-argos.timer
```

Yang benar: muncul alamat `https://...trycloudflare.com` dan dua kali `active`.

### 4.13 Uji dari laptop

**[Laptop]**
```powershell
curl.exe -I https://argos-umn.hakimhakim.workers.dev/
```

Yang benar: `HTTP/1.1 200 OK`. Kalau ada baris `location`, alamatnya **tidak boleh** `trycloudflare.com`.

Lalu periksa:

1. Buka website di browser.
2. Login di `/login`. Username komite: `president`, `vice-president`, `secretary-1`, `secretary-2`. Password awal ada di `grep SEED_ /opt/argos/.env`. Sistem akan meminta ganti password saat login pertama.
3. Coba upload satu gambar dari panel komite.
4. Uji backup:
   ```bash
   docker compose exec backup sh /scripts/backup.sh
   sudo ls -la /opt/argos/backups/daily
   ```
5. Uji restart: `sudo reboot`, tunggu 3 menit, buka website lagi. Website harus pulih sendiri.

Selesai. Website sudah online.

---

## 5. Update kode saja

Pakai bagian ini setiap kali ada perubahan **kode atau tampilan**. Isi database server (akun, project, foto yang diunggah komite) **tidak berubah**, dan link publik juga tetap sama.

**[Laptop]**
```powershell
cd D:\NOT-NOTYOU-YOU\argos_umn
git add -A
git status
git commit -m "Jelaskan perubahan singkat di sini"
git push origin main
```

**[Server]**
```bash
cd /opt/argos
git pull
docker compose build
docker compose run --rm tools npm run db:migrate
docker compose up -d
docker compose ps
```

Tunggu sampai `app` berstatus **healthy**, lalu buka website.

Jika ada perubahan di folder `worker/`, deploy ulang juga Worker-nya:

**[Laptop]**
```powershell
cd D:\NOT-NOTYOU-YOU\argos_umn\worker
npx wrangler deploy
```

---

## 6. Menyamakan isi server dengan laptop

Pakai bagian ini jika ingin server **100% sama** dengan laptop: kode, database, dan semua foto/video.

> **Peringatan**
> - Semua isi server **ditimpa**. Perubahan yang dibuat langsung di website server (upload, edit oleh komite, member baru) akan **hilang**.
> - Akun dan password ikut dari laptop, termasuk akun contoh `contoh.*` jika ada. Website ini publik, jadi pastikan tidak ada akun dengan password yang mudah ditebak.
> - Semua pengguna perlu login ulang.

### 6.1 Di laptop: kirim kode, buat salinan database dan media

**[Laptop]**
```powershell
cd D:\NOT-NOTYOU-YOU\argos_umn
git add -A
git status
git commit -m "Jelaskan perubahan singkat di sini"
git push origin main

$b = (Get-Content .env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=',''
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -Fc -f "$env:TEMP\argos.dump" $b
tar -czf "$env:TEMP\argos-media.tar.gz" -C data media
scp "$env:TEMP\argos.dump" "$env:TEMP\argos-media.tar.gz" notnot@192.168.0.118:/tmp/
```

`scp` akan meminta password `notnot`.

### 6.2 Di server: perbarui kode dan simpan cadangan kondisi lama

**[Server]**
```bash
cd /opt/argos
git pull
docker compose build
docker compose exec -T db pg_dump -U argos -Fc argos_umn > ~/server-sebelum-sinkron.dump
```

### 6.3 Di server: ganti database dan media

**[Server]**
```bash
docker compose stop app backup

docker compose exec -T db psql -U argos -d postgres -c "drop database argos_umn with (force)"
docker compose exec -T db psql -U argos -d postgres -c "create database argos_umn owner argos encoding 'UTF8' template template0"
docker compose exec -T db pg_restore -U argos -d argos_umn --no-owner < /tmp/argos.dump
docker compose exec -T db psql -U argos -d argos_umn -c "delete from sessions"

docker compose run --rm -T --no-deps -u root --entrypoint sh app \
  -c 'rm -rf /data/media/* && tar -xzf - -C /data && chown -R argos /data/media' < /tmp/argos-media.tar.gz

docker compose run --rm tools npm run db:migrate
docker compose up -d
```

### 6.4 Cek hasilnya

**[Server]**
```bash
docker compose ps
docker compose exec db psql -U argos -d argos_umn -c "select (select count(*) from accounts) akun, (select count(*) from projects) project, (select count(*) from activities) aktivitas, (select count(*) from media) media;"
```

Angkanya harus sama dengan hasil query yang sama di laptop. Login memakai password yang dipakai di laptop.

### 6.5 Jika gagal dan ingin kembali ke kondisi sebelumnya

**[Server]**
```bash
cd /opt/argos
docker compose stop app backup
docker compose exec -T db psql -U argos -d postgres -c "drop database argos_umn with (force)"
docker compose exec -T db psql -U argos -d postgres -c "create database argos_umn owner argos encoding 'UTF8' template template0"
docker compose exec -T db pg_restore -U argos -d argos_umn --no-owner < ~/server-sebelum-sinkron.dump
docker compose up -d
```

Media yang sudah ditimpa tidak ikut kembali. Pulihkan dari backup harian jika perlu (lihat README, bagian *Backup dan restore*).

---

## 7. Perintah sehari-hari

Semua perintah di bawah dijalankan di **[Server]** dari folder `/opt/argos`.

| Keperluan | Perintah |
|---|---|
| Lihat status semua layanan | `docker compose ps` |
| Lihat log website | `docker compose logs --tail 100 app` |
| Restart website | `docker compose restart app` |
| Lihat alamat tunnel saat ini | `cat /run/argos-alamat` |
| Cek tunnel | `systemctl status argos-tunnel --no-pager` |
| Log tunnel | `sudo journalctl -u argos-tunnel -n 50 --no-pager -o cat` |
| Paksa tunnel ganti alamat | `sudo systemctl restart argos-tunnel` |
| Backup sekarang | `docker compose exec backup sh /scripts/backup.sh` |
| Lihat daftar backup | `sudo ls -la backups/daily` |
| Reset password akun | `docker compose run --rm tools npm run account:reset -- <username>` |
| Bersihkan media tak terpakai | `docker compose run --rm tools npm run media:clean` |

Backup tersimpan di server yang sama. Salin isi `backups/` ke tempat lain secara berkala.

---

## 8. Masalah yang pernah terjadi

| Gejala | Penyebab | Solusi |
|---|---|---|
| Perintah di Console Proxmox gagal, ada `~` di akhir | Console menambah `~` saat menempel teks | Ketik manual atau hapus `~` dengan Backspace; lebih baik pakai SSH |
| SSH: `Permission denied` padahal password benar | Password tersimpan dengan `~` saat ditempel di Console | Di Console, `passwd notnot` lalu ketik password manual |
| `are you root?` / `Permission denied` saat `apt` | Lupa `sudo` | Tambahkan `sudo` di depan perintah |
| `Could not resolve host: github.com` | DNS sesaat gagal | Ulangi; pastikan `/etc/resolv.conf` berisi `1.1.1.1` dan `8.8.8.8` |
| `ls: cannot open directory 'backups/daily'` | Folder backup hanya bisa dibaca root | Pakai `sudo ls` |
| `/run/argos-alamat` belum ada | Skrip berjalan sebelum tunnel mendapat alamat | Tunggu 1–2 menit; timer akan mengirim sendiri |
| Website menampilkan halaman pemeliharaan | Tunnel sedang berganti alamat atau `app` mati | Tunggu 2 menit; cek `docker compose ps` dan `cat /run/argos-alamat` |
| `curl` ke `127.0.0.1:3000` menjawab `403` | Normal, header rahasia bekerja | Tidak perlu tindakan |
| `app` berstatus `unhealthy` | `compose.override.yaml` hilang atau salah | Buat ulang file di [4.7](#47-buat-file-pengaturan-khusus-server), lalu `docker compose up -d` |
| Website tidak muncul di Google | Quick Tunnel menambahkan `X-Robots-Tag: none` | Tidak bisa diatasi tanpa domain sendiri |
