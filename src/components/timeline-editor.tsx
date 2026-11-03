import { useTranslations } from 'next-intl';
import { addTimelineItem, deleteTimelineItem, moveTimelineItem, updateTimelineItem } from '@/actions/content';
import type { TimelineEntry } from '@/lib/queries';
import { ActionButton, ActionForm } from './forms';
import { Field } from './ui';

function TimelineFields({ item, prefix }: { item?: TimelineEntry & { description?: string }; prefix: string }) {
  const t = useTranslations('timeline');
  const c = useTranslations('common');
  return (
    <>
      <Field label={t('itemTitle')} htmlFor={`${prefix}-title`}>
        <input id={`${prefix}-title`} name="title" required maxLength={160} defaultValue={item?.title} className="input" />
      </Field>
      <Field label={c('description')} htmlFor={`${prefix}-description`}>
        <textarea id={`${prefix}-description`} name="description" rows={2} maxLength={2000} defaultValue={item?.description} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t('start')} htmlFor={`${prefix}-start`}>
          <input id={`${prefix}-start`} name="startDate" type="date" required defaultValue={item?.startDate} className="input" />
        </Field>
        <Field label={t('end')} htmlFor={`${prefix}-end`}>
          <input id={`${prefix}-end`} name="endDate" type="date" required defaultValue={item?.endDate} className="input" />
        </Field>
        <Field label={t('state')} htmlFor={`${prefix}-status`}>
          <select id={`${prefix}-status`} name="itemStatus" defaultValue={item?.status ?? 'not_yet'} className="input">
            <option value="not_yet">{t('not_yet')}</option>
            <option value="done">{t('done')}</option>
          </select>
        </Field>
      </div>
    </>
  );
}

/** Editor timeline untuk komite. Pemanggil memastikan project tidak terkunci. */
export function TimelineEditor({ projectId, items }: { projectId: string; items: (TimelineEntry & { description?: string })[] }) {
  const t = useTranslations('timeline');
  const c = useTranslations('common');
  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && <p>{t('empty')}</p>}
      <ol className="flex flex-col gap-4">
        {items.map((item, i) => (
          <li key={item.id} className="rounded-sm bg-surface-muted p-4">
            <ActionForm action={updateTimelineItem.bind(null, item.id)} submitLabel={c('save')} variant="secondary">
              <TimelineFields item={item} prefix={item.id} />
            </ActionForm>
            <div className="mt-3 flex flex-wrap gap-2">
              {i > 0 && <ActionButton action={moveTimelineItem.bind(null, item.id, -1)} label={c('up')} />}
              {i < items.length - 1 && <ActionButton action={moveTimelineItem.bind(null, item.id, 1)} label={c('down')} />}
              <ActionButton action={deleteTimelineItem.bind(null, item.id)} label={c('delete')} variant="danger" confirmText={`${c('delete')}: ${item.title}?`} />
            </div>
          </li>
        ))}
      </ol>
      <div className="border-t border-line pt-4">
        <h3 className="pb-2 font-semibold text-heading">{t('add')}</h3>
        <ActionForm action={addTimelineItem.bind(null, projectId)} submitLabel={t('add')} resetOnSuccess>
          <TimelineFields prefix="new" />
        </ActionForm>
      </div>
    </div>
  );
}
