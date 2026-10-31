import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { activities, carouselSlides, media, members, projects } from '@/db/schema';
import { audit } from '@/lib/audit';
import { getCurrentUser, isProjectMember } from '@/lib/auth';
import {
  MAX_IMAGE_BYTES,
  MAX_LOGO_BYTES,
  MAX_VIDEO_BYTES,
  MediaError,
  addGalleryItem,
  assertCapacity,
  storeImage,
  storeVideo,
} from '@/lib/media';

const input = z.object({
  purpose: z.enum(['gallery', 'logo', 'avatar', 'carousel']),
  ownerType: z.enum(['project', 'activity', 'member']).optional(),
  ownerId: z.uuid().optional(),
});

const fail = (error: string, status = 400) => Response.json({ error }, { status });

/** Route handler tidak mendapat pemeriksaan origin bawaan Server Action. */
function isCrossOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (isCrossOrigin(request)) return fail('common.error', 403);
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return fail('common.error', 401);
  if (Number(request.headers.get('content-length')) > MAX_VIDEO_BYTES + 1024 * 1024) return fail('editor.tooLarge', 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  const parsed = input.safeParse({
    purpose: form?.get('purpose'),
    ownerType: form?.get('ownerType') || undefined,
    ownerId: form?.get('ownerId') || undefined,
  });
  if (!(file instanceof File) || !parsed.success) return fail('common.invalid');
  const { purpose, ownerType, ownerId } = parsed.data;

  const validTarget =
    purpose === 'carousel'
      ? !ownerType
      : Boolean(ownerId) && (purpose === 'avatar' ? ownerType === 'member' : ownerType === 'project' || ownerType === 'activity');
  if (!validTarget) return fail('common.error', 403);

  const allowed =
    user.isCommittee ||
    (ownerType === 'project' && (await isProjectMember(user, ownerId!))) ||
    (purpose === 'avatar' && user.memberId === ownerId);
  if (!allowed) return fail('common.error', 403);

  const isVideo = purpose === 'gallery' && (file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name));
  const limit = isVideo ? MAX_VIDEO_BYTES : purpose === 'logo' ? MAX_LOGO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return fail('editor.tooLarge');

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (purpose === 'gallery') {
      if (ownerType !== 'project' && ownerType !== 'activity') return fail('common.invalid');
      const owner = { type: ownerType, id: ownerId! };
      await assertCapacity(owner, isVideo ? 'video' : 'image');
      const stored = isVideo ? await storeVideo(buffer) : await storeImage(buffer);
      await addGalleryItem(owner, { kind: isVideo ? 'video' : 'image', source: 'upload', ...stored });
    } else {
      const stored = await storeImage(buffer);
      const [item] = await db.insert(media).values({ purpose, kind: 'image', source: 'upload', ...stored }).returning();
      if (purpose === 'carousel') {
        await db.insert(carouselSlides).values({ mediaId: item.id, sortOrder: Date.now() % 2_000_000_000 });
      } else if (purpose === 'avatar') {
        await db.update(members).set({ photoMediaId: item.id }).where(eq(members.id, ownerId!));
      } else if (ownerType === 'project') {
        await db.update(projects).set({ logoMediaId: item.id }).where(eq(projects.id, ownerId!));
      } else {
        await db.update(activities).set({ logoMediaId: item.id }).where(eq(activities.id, ownerId!));
      }
    }
  } catch (error) {
    if (error instanceof MediaError) return fail(`editor.${error.code}`);
    throw error;
  }

  await audit(user.accountId, 'media.upload', ownerType ?? purpose, ownerId ?? null, { purpose });
  return Response.json({ ok: true });
}
