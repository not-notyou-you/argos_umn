import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import type { activities, projects } from '@/db/schema';
import { slugify } from './util';

/** Slug unik dari nama; menambah akhiran -2, -3, dan seterusnya bila sudah dipakai. */
export async function uniqueSlug(table: typeof projects | typeof activities, name: string) {
  const base = slugify(name);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const [row] = await db.select({ id: table.id }).from(table).where(eq(table.slug, slug));
    if (!row) return slug;
  }
}
