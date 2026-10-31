#!/bin/sh
# Satu kali backup terenkripsi: database dan media. Menyimpan 7 harian dan 4 mingguan.
# Berkas tetap harus disalin ke luar server utama.
set -eu

: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE wajib diisi}"
BACKUP_DIR=${BACKUP_DIR:-/backups}
MEDIA_PARENT=${MEDIA_PARENT:-/data}
PGHOST=${PGHOST:-db}
PGUSER=${PGUSER:-argos}
PGDATABASE=${PGDATABASE:-argos_umn}
export PGHOST PGUSER PGDATABASE

umask 077
stamp=$(date +%Y-%m-%d)
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

encrypt() {
  openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:BACKUP_PASSPHRASE -out "$1"
}

db_file="$BACKUP_DIR/daily/db-$stamp.dump.enc"
media_file="$BACKUP_DIR/daily/media-$stamp.tar.gz.enc"

pg_dump -Fc | encrypt "$db_file.tmp"
mv "$db_file.tmp" "$db_file"

if [ -d "$MEDIA_PARENT/media" ]; then
  tar -czf - -C "$MEDIA_PARENT" media | encrypt "$media_file.tmp"
  mv "$media_file.tmp" "$media_file"
fi

if [ "$(date +%u)" = "7" ]; then
  cp "$db_file" "$BACKUP_DIR/weekly/"
  [ -f "$media_file" ] && cp "$media_file" "$BACKUP_DIR/weekly/"
fi

prune() {
  # shellcheck disable=SC2012
  ls -1t "$1"/"$2"-* 2>/dev/null | tail -n +"$3" | while read -r old; do rm -f "$old"; done
}
prune "$BACKUP_DIR/daily" db 8
prune "$BACKUP_DIR/daily" media 8
prune "$BACKUP_DIR/weekly" db 5
prune "$BACKUP_DIR/weekly" media 5

echo "Backup selesai: $stamp"
