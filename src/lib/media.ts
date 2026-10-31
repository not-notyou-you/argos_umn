import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/db';
import { media } from '@/db/schema';

export const IMAGE_WIDTHS = [480, 960, 1600] as const;
export const MAX_PHOTOS = 10;
export const MAX_VIDEOS = 1;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 95 * 1024 * 1024;

export type Owner = { type: 'project' | 'activity'; id: string };

export class MediaError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

export const mediaDir = () => path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR ?? './data/media');

/** Memproses gambar: tolak selain JPEG/PNG/WebP, hapus EXIF, buat tiga ukuran WebP. */
export async function storeImage(input: Buffer) {
  const key = createHash('sha256').update(input).digest('hex').slice(0, 32);
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new MediaError('invalidType');
  }
  if (!meta.format || !['jpeg', 'png', 'webp'].includes(meta.format)) throw new MediaError('invalidType');

  const dir = path.join(mediaDir(), 'images');
  await mkdir(dir, { recursive: true });

  let width = 0;
  let height = 0;
  for (const w of IMAGE_WIDTHS) {
    const { data, info } = await sharp(input)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    await writeFile(path.join(dir, `${key}-${w}.webp`), data);
    if (w === 1600) ({ width, height } = info);
  }
  return { storageKey: key, width, height, mime: 'image/webp', bytes: input.length };
}

export async function storeVideo(input: Buffer) {
  const isMp4 = input.subarray(4, 8).toString('latin1') === 'ftyp';
  const isWebm = input.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (!isMp4 && !isWebm) throw new MediaError('invalidType');

  const ext = isMp4 ? 'mp4' : 'webm';
  const key = `${createHash('sha256').update(input).digest('hex').slice(0, 32)}.${ext}`;
  const dir = path.join(mediaDir(), 'videos');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), input);
  return { storageKey: key, mime: isMp4 ? 'video/mp4' : 'video/webm', bytes: input.length };
}

/**
 * Tautan gambar Drive tidak stabil, jadi server menyimpan salinan.
 * URL dibentuk dari ID hasil parsing untuk mencegah SSRF.
 */
export async function fetchDriveImage(id: string) {
  let response: Response;
  try {
    response = await fetch(`https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new MediaError('driveFailed');
  }
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new MediaError('driveFailed');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new MediaError('tooLarge');
  return storeImage(buffer);
}

const ownerFilter = (owner: Owner) => {
  const column = owner.type === 'project' ? media.projectId : media.activityId;
  return and(eq(column, owner.id), eq(media.purpose, 'gallery'));
};

export const ownerColumns = (owner: Owner) =>
  owner.type === 'project' ? { projectId: owner.id } : { activityId: owner.id };

export async function assertCapacity(owner: Owner, kind: 'image' | 'video') {
  const [row] = await db.select({ n: count() }).from(media).where(and(ownerFilter(owner), eq(media.kind, kind)));
  const limit = kind === 'image' ? MAX_PHOTOS : MAX_VIDEOS;
  if (row.n >= limit) throw new MediaError(kind === 'image' ? 'tooManyPhotos' : 'tooManyVideos');
}

export async function addGalleryItem(owner: Owner, item: Partial<typeof media.$inferInsert> & Pick<typeof media.$inferInsert, 'kind' | 'source'>) {
  const existing = await db.select({ sortOrder: media.sortOrder, kind: media.kind, isCover: media.isCover }).from(media).where(ownerFilter(owner));
  const nextOrder = existing.reduce((max, m) => Math.max(max, m.sortOrder + 1), 0);
  const needsCover = item.kind === 'image' && !existing.some((m) => m.isCover);
  const [created] = await db
    .insert(media)
    .values({ ...item, ...ownerColumns(owner), purpose: 'gallery', sortOrder: nextOrder, isCover: needsCover })
    .returning();
  return created;
}

/** Foto pertama menjadi foto utama jika belum ada; tanpa foto, UI memakai placeholder. */
export async function ensureCover(owner: Owner) {
  const items = await db.select().from(media).where(and(ownerFilter(owner), eq(media.kind, 'image'))).orderBy(asc(media.sortOrder));
  if (items.length > 0 && !items.some((m) => m.isCover)) {
    await db.update(media).set({ isCover: true }).where(eq(media.id, items[0].id));
  }
}

export const unattached = () => and(isNull(media.projectId), isNull(media.activityId));
