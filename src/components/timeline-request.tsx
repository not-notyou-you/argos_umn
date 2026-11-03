'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { sendTimelineRequest } from '@/actions/members';
import { ActionForm } from './forms';
import { Field } from './ui';

type Item = { id: string; title: string; status: 'not_yet' | 'done'; startDate: string; endDate: string };

/** Form anggota untuk mengusulkan perubahan status atau tanggal satu tahap timeline. */
export function TimelineRequestForm({ items }: { items: Item[] }) {
  const t = useTranslations('timeline');
  const [itemId, setItemId] = useState(items[0]?.id ?? '');
  const [kind, setKind] = useState<'status' | 'dates'>('status');
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;
  return (
    <ActionForm key={`${itemId}-${kind}`} action={sendTimelineRequest.bind(null, itemId)} submitLabel={t('send')} variant="secondary" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('itemTitle')} htmlFor="tr-item">
          <select id="tr-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className="input">
            {items.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </Field>
        <Field label={t('kind')} htmlFor="tr-kind">
          <select id="tr-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as 'status' | 'dates')} className="input">
            <option value="status">{t('kindStatus')}</option>
            <option value="dates">{t('kindDates')}</option>
          </select>
        </Field>
      </div>
      {kind === 'status' ? (
        <Field label={t('proposedStatus')} htmlFor="tr-status">
          <select id="tr-status" name="proposedStatus" defaultValue={item.status === 'done' ? 'not_yet' : 'done'} className="input">
            <option value="done">{t('done')}</option>
            <option value="not_yet">{t('not_yet')}</option>
          </select>
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('start')} htmlFor="tr-start"><input id="tr-start" name="proposedStart" type="date" required defaultValue={item.startDate} className="input" /></Field>
          <Field label={t('end')} htmlFor="tr-end"><input id="tr-end" name="proposedEnd" type="date" required defaultValue={item.endDate} className="input" /></Field>
        </div>
      )}
      <Field label={t('evidenceUrl')} htmlFor="tr-url"><input id="tr-url" name="evidenceUrl" type="url" maxLength={500} className="input" /></Field>
      <Field label={t('note')} htmlFor="tr-note"><textarea id="tr-note" name="note" rows={3} maxLength={1000} className="input" /></Field>
    </ActionForm>
  );
}
