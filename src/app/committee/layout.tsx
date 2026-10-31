import { count, eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';
import { PanelShell } from '@/components/shell';
import { db } from '@/db';
import { involvementRequests } from '@/db/schema';
import { requireCommittee } from '@/lib/auth';

export default async function CommitteeLayout({ children }: { children: ReactNode }) {
  const user = await requireCommittee();
  const t = await getTranslations('committee');
  const nav = await getTranslations('nav');
  const [{ n }] = await db.select({ n: count() }).from(involvementRequests).where(eq(involvementRequests.status, 'pending'));
  const items = [
    { href: '/committee', label: t('dashboard') },
    { href: '/committee/landing', label: t('landing') },
    { href: '/committee/projects', label: t('projects') },
    { href: '/committee/activities', label: t('activities') },
    { href: '/committee/members', label: t('members') },
    { href: '/committee/requests', label: t('requests'), badge: n },
    { href: '/committee/system', label: t('system') },
    { href: '/committee/audit', label: t('audit') },
    ...(user.memberId ? [{ href: '/me/profile', label: nav('myProfile') }] : []),
  ];
  return <Suspense><PanelShell title="Committee" items={items}>{children}</PanelShell></Suspense>;
}
