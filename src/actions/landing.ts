'use server';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { carouselSlides, media, siteContent } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireCommittee } from '@/lib/auth';
import { safeHttpUrl } from '@/lib/util';
import type { ActionResult } from './types';

const about = z.object({
  heroTitle: z.string().trim().min(1).max(120),
  heroSubtitle: z.string().trim().max(300),
  aboutTitle: z.string().trim().min(1).max(120),
  aboutBody: z.string().trim().max(5000),
  tiofTitle: z.string().trim().min(1).max(120),
  tiofBody: z.string().trim().max(5000),
});

export async function updateAbout(formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const parsed = about.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'common.invalid' };
  await db
    .insert(siteContent)
    .values({ key: 'about', value: parsed.data, updatedBy: user.accountId })
    .onConflictDoUpdate({ target: siteContent.key, set: { value: parsed.data, updatedBy: user.accountId } });
  await audit(user.accountId, 'landing.update', 'site_content', 'about');
  return { ok: true };
}

export async function updateSlide(slideId: string, formData: FormData): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = z.uuid().parse(slideId);
  const link = String(formData.get('linkUrl') ?? '').trim();
  const linkUrl = link ? safeHttpUrl(link) : null;
  if (link && !linkUrl) return { error: 'common.invalidUrl' };
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 200);
  await db
    .update(carouselSlides)
    .set({ caption, linkUrl, isActive: formData.get('isActive') === 'on' })
    .where(eq(carouselSlides.id, id));
  await audit(user.accountId, 'carousel.update', 'carousel_slide', id);
  return { ok: true };
}

export async function deleteSlide(slideId: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const [slide] = await db.delete(carouselSlides).where(eq(carouselSlides.id, z.uuid().parse(slideId))).returning();
  if (slide) await db.delete(media).where(eq(media.id, slide.mediaId));
  await audit(user.accountId, 'carousel.delete', 'carousel_slide', slideId);
  return { ok: true };
}

export async function moveSlide(ids: string[]): Promise<ActionResult> {
  await requireCommittee();
  const list = z.array(z.uuid()).parse(ids);
  await db.transaction(async (tx) => {
    for (const [i, id] of list.entries()) await tx.update(carouselSlides).set({ sortOrder: i }).where(eq(carouselSlides.id, id));
  });
  return { ok: true };
}
