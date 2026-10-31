import { cpSync, rmSync } from 'node:fs';

// Server standalone membaca daftar aset saat start, jadi penyalinan harus lebih dulu.
rmSync('data/test-media', { recursive: true, force: true });
cpSync('public', '.next/standalone/public', { recursive: true });
cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
