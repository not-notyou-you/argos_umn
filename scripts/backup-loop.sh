#!/bin/sh
# Backup harian: database dan media. Menyimpan 7 harian dan 4 mingguan.
# Folder ./backups masih di server yang sama: salin ke lokasi lain secara terpisah.
set -eu

run_backup() {
  stamp=$(date +%Y-%m-%d)
  mkdir -p /backups/daily /backups/weekly
  pg_dump -h db -U argos -d argos_umn -Fc -f "/backups/daily/db-$stamp.dump.tmp"
  mv "/backups/daily/db-$stamp.dump.tmp" "/backups/daily/db-$stamp.dump"
  tar -czf "/backups/daily/media-$stamp.tar.gz.tmp" -C /data media
  mv "/backups/daily/media-$stamp.tar.gz.tmp" "/backups/daily/media-$stamp.tar.gz"

  if [ "$(date +%u)" = "7" ]; then
    cp "/backups/daily/db-$stamp.dump" "/backups/daily/media-$stamp.tar.gz" /backups/weekly/
  fi

  ls -1t /backups/daily/db-* | tail -n +8 | xargs -r rm -f
  ls -1t /backups/daily/media-* | tail -n +8 | xargs -r rm -f
  ls -1t /backups/weekly/db-* 2>/dev/null | tail -n +5 | xargs -r rm -f
  ls -1t /backups/weekly/media-* 2>/dev/null | tail -n +5 | xargs -r rm -f
  echo "Backup selesai: $stamp"
}

while true; do
  run_backup || echo "Backup GAGAL: $(date)"
  sleep 86400
done
