import { getTranslations } from 'next-intl/server';
import { type ReactNode, Suspense } from 'react';
import { PanelShell } from '@/components/shell';
import { requireMember } from '@/lib/auth';

export default async function MemberLayout({ children }: { children: ReactNode }) {
  const user = await requireMember();
  const t = await getTranslations('nav');
  const items = [
    { href: '/me/profile', label: t('myProfile') },
    { href: '/me/projects', label: t('myProjects') },
    ...(user.isCommittee ? [{ href: '/committee', label: t('committee') }] : []),
  ];
  return <Suspense><PanelShell title="Argos Club @ UMN" items={items}>{children}</PanelShell></Suspense>;
}
