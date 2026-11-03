'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { submitProposal } from '@/actions/proposals';
import { ActionForm } from './forms';
import { Field } from './ui';

/** Form usulan project: nama, deskripsi, dan minimal satu tahap timeline. */
export function ProposalForm() {
  const t = useTranslations('proposal');
  const tl = useTranslations('timeline');
  const c = useTranslations('common');
  const [stages, setStages] = useState([0]);
  const [next, setNext] = useState(1);
  return (
    <ActionForm action={submitProposal} submitLabel={t('submit')} resetOnSuccess>
      <Field label={t('name')} htmlFor="p-name"><input id="p-name" name="name" required maxLength={120} className="input" /></Field>
      <Field label={c('description')} htmlFor="p-description" hint={t('descriptionHint')}>
        <textarea id="p-description" name="description" required rows={5} maxLength={10000} className="input" />
      </Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold text-heading">{tl('title')}</legend>
        <p className="text-sm leading-[22px]">{t('timelineHint')}</p>
        {stages.map((key, i) => (
          <div key={key} className="flex flex-col gap-3 rounded-sm bg-surface-muted p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-heading">{t('stage', { n: i + 1 })}</p>
              {stages.length > 1 && (
                <button type="button" onClick={() => setStages(stages.filter((k) => k !== key))} className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold text-danger">
                  <Trash2 size={16} aria-hidden /> {c('remove')}
                </button>
              )}
            </div>
            <Field label={tl('itemTitle')} htmlFor={`s-title-${key}`}><input id={`s-title-${key}`} name="stageTitle" required maxLength={160} className="input" /></Field>
            <Field label={c('description')} htmlFor={`s-desc-${key}`}><textarea id={`s-desc-${key}`} name="stageDescription" rows={2} maxLength={2000} className="input" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tl('start')} htmlFor={`s-start-${key}`}><input id={`s-start-${key}`} name="stageStart" type="date" required className="input" /></Field>
              <Field label={tl('end')} htmlFor={`s-end-${key}`}><input id={`s-end-${key}`} name="stageEnd" type="date" required className="input" /></Field>
            </div>
          </div>
        ))}
        {stages.length < 20 && (
          <div>
            <button
              type="button"
              onClick={() => {
                setStages([...stages, next]);
                setNext(next + 1);
              }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1 font-semibold text-teal-text"
            >
              <Plus size={16} aria-hidden /> {tl('add')}
            </button>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
}
