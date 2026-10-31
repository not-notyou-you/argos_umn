'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { decideRequest } from '@/actions/members';
import { Button } from './ui';

export function RequestDecision({ requestId }: { requestId: string }) {
  const t = useTranslations('committee');
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();
  const decide = (approve: boolean) =>
    start(async () => {
      await decideRequest(requestId, approve, reason);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t('reason')} placeholder={t('reason')} className="input" />
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={() => decide(true)}>{t('approve')}</Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => decide(false)}>{t('reject')}</Button>
      </div>
    </div>
  );
}
