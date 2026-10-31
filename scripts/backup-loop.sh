#!/bin/sh
# Menjalankan backup setiap hari di dalam kontainer `backup`.
apk add --no-cache openssl >/dev/null

while true; do
  sh /scripts/backup.sh || echo "Backup GAGAL: $(date)"
  sleep 86400
done
