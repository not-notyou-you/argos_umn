'use server';

import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { projectMembers, projectProposals, projectTimelineItems, projects } from '@/db/schema';
import { audit } from '@/lib/audit';
import { requireCommittee, requireMember } from '@/lib/auth';
import { uniqueSlug } from '@/lib/slug';
import type { ActionResult } from './types';

const MAX_PENDING = 3;

const stage = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine((v) => v.endDate >= v.startDate);

const proposal = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(10_000),
  timeline: z.array(stage).min(1).max(20),
});

/** Tahap dikirim sebagai field berulang, lalu dipasangkan per indeks. */
function readStages(formData: FormData) {
  const titles = formData.getAll('stageTitle').map(String);
  const descriptions = formData.getAll('stageDescription').map(String);
  const starts = formData.getAll('stageStart').map(String);
  const ends = formData.getAll('stageEnd').map(String);
  return titles
    .map((title, i) => ({ title, description: descriptions[i] ?? '', startDate: starts[i] ?? '', endDate: ends[i] ?? '' }))
    .filter((s) => s.title.trim() || s.startDate || s.endDate);
}

export async function submitProposal(formData: FormData): Promise<ActionResult> {
  const user = await requireMember();
  const parsed = proposal.safeParse({ name: formData.get('name'), description: formData.get('description'), timeline: readStages(formData) });
  if (!parsed.success) {
    return { error: parsed.error.issues.some((i) => i.path[0] === 'timeline') ? 'proposal.timelineInvalid' : 'proposal.invalid' };
  }
  const [{ n }] = await db
    .select({ n: count() })
    .from(projectProposals)
    .where(and(eq(projectProposals.memberId, user.memberId), eq(projectProposals.status, 'pending')));
  if (n >= MAX_PENDING) return { error: 'proposal.tooMany' };

  const [row] = await db.insert(projectProposals).values({ memberId: user.memberId, ...parsed.data }).returning();
  await audit(user.accountId, 'proposal.submit', 'project_proposal', row.id, { name: row.name });
  return { ok: true };
}

/**
 * Diterima: project dibuat berstatus open dan langsung dipublikasikan agar muncul di halaman Information,
 * timeline disalin, dan pengusul menjadi anggota. Ditolak: feedback wajib.
 */
export async function decideProposal(proposalId: string, approve: boolean, decisionNote: string): Promise<ActionResult> {
  const user = await requireCommittee();
  const id = z.uuid().parse(proposalId);
  const note = decisionNote.trim().slice(0, 1000);
  if (!approve && !note) return { error: 'proposal.feedbackRequired' };

  const [pending] = await db.select({ name: projectProposals.name }).from(projectProposals).where(eq(projectProposals.id, id));
  const slug = approve && pending ? await uniqueSlug(projects, pending.name) : null;

  const projectId = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(projectProposals)
      .set({ status: approve ? 'approved' : 'rejected', decidedBy: user.accountId, decidedAt: new Date(), decisionNote: note || null })
      .where(and(eq(projectProposals.id, id), eq(projectProposals.status, 'pending')))
      .returning();
    if (!row || !approve) return null;

    const [project] = await tx
      .insert(projects)
      .values({ name: row.name, slug: slug!, description: row.description, status: 'open', isPublished: true, publishedAt: new Date() })
      .returning();
    await tx.insert(projectTimelineItems).values(row.timeline.map((s, i) => ({ ...s, projectId: project.id, sortOrder: i })));
    await tx.insert(projectMembers).values({ projectId: project.id, memberId: row.memberId });
    await tx.update(projectProposals).set({ projectId: project.id }).where(eq(projectProposals.id, row.id));
    return project.id;
  });

  await audit(user.accountId, approve ? 'proposal.approve' : 'proposal.reject', 'project_proposal', id, projectId ? { projectId } : undefined);
  return { ok: true };
}
