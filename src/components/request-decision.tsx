'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { decideRequest } from '@/actions/members';
import type { ActionResult } from '@/actions/types';
import { Button, Notice } from './ui';

/** Dipakai untuk request keterlibatan dan request timeline; `decide` default ke request keterlibatan. */
export function RequestDecision({
  requestId,
  decide: action = decideRequest,
  requireReasonOnReject = false,
}: {
  requestId: string;
  /** Penolakan wajib disertai alasan; tombol Tolak nonaktif selama alasan kosong. */
  requireReasonOnReject?: boolean;
  decide?: (requestId: string, approve: boolean, decisionNote: string) => Promise<ActionResult>;
}) {
  const t = useTranslations('committee');
  const reasonLabel = requireReasonOnReject ? t('reasonRequired') : t('reason');
  const root = useTranslations();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const decide = (approve: boolean) =>
    start(async () => {
      const result = await action(requestId, approve, reason);
      setError(result?.error);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label={reasonLabel} placeholder={reasonLabel} className="input" />
      <div className="flex gap-2">
        <Button type="button" disabled={pending} onClick={() => decide(true)}>{t('approve')}</Button>
        <Button type="button" variant="secondary" disabled={pending || (requireReasonOnReject && !reason.trim())} onClick={() => decide(false)}>{t('reject')}</Button>
      </div>
      {error && <Notice tone="error">{root(error)}</Notice>}
    </div>
  );
}
