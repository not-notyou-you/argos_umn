import 'server-only';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';

export async function audit(
  actorAccountId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({ actorAccountId, action, entityType, entityId, changes });
}
