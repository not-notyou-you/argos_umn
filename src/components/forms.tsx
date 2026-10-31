'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useActionState, useEffect, useRef, useState, useTransition } from 'react';
import type { ActionResult } from '@/actions/types';
import { Button, type ButtonVariant, Notice } from './ui';

/**
 * Form server action tanpa reset otomatis, agar isian tidak hilang saat error.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  variant,
  className = 'flex flex-col gap-4',
  resetOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    start(async () => {
      const next = (await action(data)) ?? {};
      setResult(next);
      if (next.ok) {
        if (resetOnSuccess) form.reset();
        router.refresh();
      }
    });
  }

  return (
    <form method="post" onSubmit={submit} className={className}>
      {children}
      {result?.error && <Notice tone="error">{t(result.error)}</Notice>}
      {result?.ok && !result.temporaryPassword && <Notice tone="success">{t('common.saved')}</Notice>}
      {result?.temporaryPassword && <TemporaryPassword value={result.temporaryPassword} />}
      <div><Button type="submit" variant={variant} disabled={pending}>{submitLabel}</Button></div>
    </form>
  );
}

export function TemporaryPassword({ value }: { value: string }) {
  const t = useTranslations('committee');
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-sm border-l-4 border-brand-orange bg-surface-muted p-3">
      <p className="font-semibold text-ink">{t('tempTitle')}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code data-testid="temp-password" className="rounded-sm bg-white px-2 py-1 text-ink">{value}</code>
        <button
          type="button"
          className="min-h-11 cursor-pointer font-semibold text-teal-text"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <p className="mt-1 text-sm leading-[22px]">{t('tempWarn')}</p>
    </div>
  );
}

/** Form login tetap berjalan sebelum JavaScript aktif, jadi password tidak pernah masuk URL. */
export function ProgressiveForm({
  action,
  submitLabel,
  children,
}: {
  action: (previous: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  submitLabel: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const [result, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {result?.error && <Notice tone="error">{t(result.error)}</Notice>}
      <div><Button type="submit" disabled={pending}>{submitLabel}</Button></div>
    </form>
  );
}

/** Tombol satu aksi, dengan konfirmasi opsional. */
export function ActionButton({
  action,
  label,
  variant = 'secondary',
  confirmText,
}: {
  action: () => Promise<ActionResult>;
  label: string;
  variant?: ButtonVariant;
  confirmText?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={variant}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          start(async () => {
            const next = (await action()) ?? {};
            setResult(next);
            if (next.ok) router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {result?.error && <Notice tone="error">{t(result.error)}</Notice>}
      {result?.temporaryPassword && <TemporaryPassword value={result.temporaryPassword} />}
    </div>
  );
}

/** Aksi hapus wajib mengetik nama item. */
export function ConfirmDelete({ name, action }: { name: string; action: () => Promise<ActionResult> }) {
  const t = useTranslations('committee');
  const c = useTranslations('common');
  const root = useTranslations();
  const ref = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  useEffect(() => setTyped(''), [name]);

  return (
    <>
      <Button type="button" variant="danger" onClick={() => ref.current?.showModal()}>{c('delete')}</Button>
      <dialog ref={ref} aria-labelledby="delete-title" className="m-auto w-[calc(100%-32px)] max-w-md rounded-md p-6 backdrop:bg-ink/60">
        <h2 id="delete-title" className="text-xl leading-7 font-semibold">{t('deleteTitle', { name })}</h2>
        <p className="mt-2">{t('deleteConfirm', { name })}</p>
        <input aria-label={t('typeName')} value={typed} onChange={(e) => setTyped(e.target.value)} className="input mt-3" />
        {error && <div className="mt-3"><Notice tone="error">{root(error)}</Notice></div>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>{c('cancel')}</Button>
          <Button
            type="button"
            variant="danger"
            disabled={typed !== name || pending}
            onClick={() => start(async () => setError((await action())?.error))}
          >
            {c('delete')}
          </Button>
        </div>
      </dialog>
    </>
  );
}

/** Upload satu gambar untuk logo, avatar, atau slide carousel. */
export function ImageUpload({ purpose, ownerType, ownerId, label }: { purpose: 'logo' | 'avatar' | 'carousel'; ownerType?: string; ownerId?: string; label: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function upload(file: File) {
    setBusy(true);
    setError(undefined);
    const body = new FormData();
    body.set('file', file);
    body.set('purpose', purpose);
    if (ownerType) body.set('ownerType', ownerType);
    if (ownerId) body.set('ownerId', ownerId);
    const response = await fetch('/api/upload', { method: 'POST', body }).catch(() => null);
    const result = await response?.json().catch(() => null);
    setBusy(false);
    if (response?.ok) router.refresh();
    else setError(result?.error ?? 'common.error');
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex min-h-11 w-fit cursor-pointer items-center rounded-sm border border-teal-text px-4 font-semibold text-teal-text hover:bg-surface-muted has-[:focus-visible]:outline-2">
        {busy ? t('editor.uploading') : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = '';
          }}
        />
      </label>
      {error && <Notice tone="error">{t(error)}</Notice>}
    </div>
  );
}

export function CheckList({ name, options, selected, label }: { name: string; options: { id: string; label: string }[]; selected: Set<string>; label: string }) {
  const c = useTranslations('common');
  const [q, setQ] = useState('');
  const needle = q.toLowerCase();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="font-semibold text-ink">{label}</legend>
      {options.length > 8 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c('search')} aria-label={c('search')} className="input" />}
      {options.length === 0 && <p>{c('noData')}</p>}
      <div className="grid max-h-64 gap-x-4 overflow-y-auto sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className={`min-h-11 items-center gap-2 ${o.label.toLowerCase().includes(needle) ? 'flex' : 'hidden'}`}>
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.has(o.id)} className="size-5" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
