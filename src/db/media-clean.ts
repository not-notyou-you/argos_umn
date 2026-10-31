/** Menghapus berkas media yang tidak lagi direferensikan dan berumur lebih dari 7 hari. */
import 'dotenv/config';
import { readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { media } from './schema';

const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
const db = drizzle(client);
const root = path.resolve(process.env.MEDIA_DIR ?? './data/media');
const cutoff = Date.now() - 7 * 86_400_000;

const rows = await db.select({ key: media.storageKey }).from(media).where(isNotNull(media.storageKey));
const used = new Set(rows.map((r) => r.key!));

let removed = 0;
for (const folder of ['images', 'videos']) {
  const dir = path.join(root, folder);
  const files = await readdir(dir).catch(() => []);
  for (const file of files) {
    const key = folder === 'images' ? file.replace(/-\d+\.webp$/, '') : file;
    const full = path.join(dir, file);
    if (!used.has(key) && (await stat(full)).mtimeMs < cutoff) {
      await rm(full);
      removed++;
    }
  }
}

console.log(`Berkas dihapus: ${removed}`);
await client.end();
