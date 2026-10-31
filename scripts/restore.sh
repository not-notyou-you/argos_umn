#!/bin/sh
# Memulihkan backup terenkripsi. Pemakaian: restore.sh <db-*.dump.enc> [media-*.tar.gz.enc]
set -eu

: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE wajib diisi}"
MEDIA_PARENT=${MEDIA_PARENT:-/data}
PGHOST=${PGHOST:-db}
PGUSER=${PGUSER:-argos}
PGDATABASE=${PGDATABASE:-argos_umn}
export PGHOST PGUSER PGDATABASE

decrypt() {
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:BACKUP_PASSPHRASE -in "$1"
}

decrypt "$1" | pg_restore --clean --if-exists --no-owner -d "$PGDATABASE"
if [ -n "${2:-}" ]; then
  decrypt "$2" | tar -xzf - -C "$MEDIA_PARENT"
fi
echo "Restore selesai."
