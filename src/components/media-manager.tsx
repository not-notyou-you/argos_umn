'use client';

/* eslint-disable @next/next/no-img-element */
import { ArrowDown, ArrowUp, Film, Star, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addMediaLink, deleteMedia, reorderMedia, setCover, updateMediaAlt } from '@/actions/content';
import type { ActionResult } from '@/actions/types';
import { imageUrl } from '@/lib/media-url';
import { Button, Notice } from './ui';

type Item = {
  id: string;
  kind: 'image' | 'video';
  source: 'upload' | 'drive' | 'youtube';
  storageKey: string | null;
  externalId: string | null;
  isCover: boolean;
  altText: string | null;
};
type Owner = { type: 'project' | 'activity'; id: string };
type Upload = { name: string; percent: number; error?: string; file: File };

function send(file: File, owner: Owner, onProgress: (percent: number) => void) {
  return new Promise<string | null>((resolve) => {
    const body = new FormData();
    body.set('file', file);
    body.set('purpose', 'gallery');
    body.set('ownerType', owner.type);
    body.set('ownerId', owner.id);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => resolve(xhr.status < 300 ? null : (xhr.response?.error ?? 'common.error'));
    xhr.onerror = () => resolve('common.error');
    xhr.send(body);
  });
}

export function MediaManager({ owner, items }: { owner: Owner; items: Item[] }) {
  const t = useTranslations('editor');
  const c = useTranslations('common');
  const root = useTranslations();
  const router = useRouter();
  const [, start] = useTransition();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [error, setError] = useState<string>();
  const [drag, setDrag] = useState<string | null>(null);
  const [photoLink, setPhotoLink] = useState('');
  const [videoLink, setVideoLink] = useState('');

  const photos = items.filter((m) => m.kind === 'image');
  const video = items.find((m) => m.kind === 'video');

  const run = (action: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      const result = await action();
      setError(result.error);
      if (result.ok) {
        after?.();
        router.refresh();
      }
    });

  async function uploadFiles(files: File[]) {
    setUploads((list) => [...list, ...files.map((file) => ({ name: file.name, percent: 0, file }))]);
    for (const file of files) {
      const failure = await send(file, owner, (percent) =>
        setUploads((list) => list.map((u) => (u.file === file ? { ...u, percent } : u))),
      );
      setUploads((list) => (failure ? list.map((u) => (u.file === file ? { ...u, error: failure } : u)) : list.filter((u) => u.file !== file)));
      if (!failure) router.refresh();
    }
  }

  const order = (ids: string[]) => run(() => reorderMedia(owner, ids));
  const move = (index: number, delta: number) => {
    const ids = photos.map((p) => p.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    order(ids);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{t('photos')} <span data-testid="photo-count">{photos.length}/10</span></h3>
          <p className="text-sm leading-[22px]">{photos.length ? t('coverSet') : t('noCover')}</p>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length) uploadFiles([...e.dataTransfer.files]);
          }}
          className="mt-2 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-brand-light-gray p-4 text-center has-[:focus-visible]:outline-2"
        >
          <span>{t('dropHint')}</span>
          <span className="font-semibold text-teal-text">{t('chooseFile')}</span>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            data-testid="photo-input"
            onChange={(e) => {
              uploadFiles([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
        </label>

        {uploads.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {uploads.map((u) => (
              <li key={u.name + u.file.lastModified} className="text-sm leading-[22px]">
                {u.name}:{' '}
                {u.error ? (
                  <span className="text-danger">
                    {root(u.error)}{' '}
                    <button
                      type="button"
                      className="cursor-pointer font-semibold underline"
                      onClick={() => {
                        setUploads((list) => list.filter((x) => x.file !== u.file));
                        uploadFiles([u.file]);
                      }}
                    >
                      {t('retry')}
                    </button>
                  </span>
                ) : (
                  <progress value={u.percent} max={100} aria-label={t('uploading')} />
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex gap-2">
          <input value={photoLink} onChange={(e) => setPhotoLink(e.target.value)} aria-label={t('photoLinkLabel')} placeholder={t('photoLinkLabel')} className="input" />
          <Button type="button" variant="secondary" className="shrink-0" disabled={!photoLink} onClick={() => run(() => addMediaLink(owner, 'image', photoLink), () => setPhotoLink(''))}>{t('addLink')}</Button>
        </div>

        {photos.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, i) => (
              <li
                key={photo.id}
                draggable
                onDragStart={() => setDrag(photo.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!drag || drag === photo.id) return;
                  const ids = photos.map((p) => p.id).filter((id) => id !== drag);
                  ids.splice(i, 0, drag);
                  order(ids);
                  setDrag(null);
                }}
                className="overflow-hidden rounded-md border border-line bg-white"
              >
                <div className="relative">
                  <img src={imageUrl(photo.storageKey!, 480)} alt={photo.altText ?? ''} className="aspect-[16/10] w-full object-cover" />
                  {photo.isCover && <span className="absolute top-2 left-2 rounded-sm bg-brand-orange px-2 text-sm font-semibold text-ink">{t('cover')}</span>}
                </div>
                <div className="flex flex-col gap-1 p-2">
                  <input
                    aria-label={t('alt')}
                    placeholder={t('alt')}
                    defaultValue={photo.altText ?? ''}
                    className="input"
                    onBlur={(e) => {
                      if (e.target.value !== (photo.altText ?? '')) run(() => updateMediaAlt(owner, photo.id, e.target.value));
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <button type="button" aria-label={c('up')} title={c('up')} onClick={() => move(i, -1)} className="flex size-11 cursor-pointer items-center justify-center"><ArrowUp size={18} /></button>
                    <button type="button" aria-label={c('down')} title={c('down')} onClick={() => move(i, 1)} className="flex size-11 cursor-pointer items-center justify-center"><ArrowDown size={18} /></button>
                    <button type="button" aria-label={t('setCover')} title={t('setCover')} aria-pressed={photo.isCover} onClick={() => run(() => setCover(owner, photo.id))} className="flex size-11 cursor-pointer items-center justify-center text-orange-text"><Star size={18} fill={photo.isCover ? 'currentColor' : 'none'} /></button>
                    <button type="button" aria-label={c('delete')} title={c('delete')} onClick={() => run(() => deleteMedia(owner, photo.id))} className="flex size-11 cursor-pointer items-center justify-center text-danger"><Trash2 size={18} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="font-semibold">{t('video')} {video ? 1 : 0}/1</h3>
        {video ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-line bg-white p-2">
            <span className="flex items-center gap-2"><Film size={18} aria-hidden /> {video.source}{video.externalId ? `: ${video.externalId}` : ''}</span>
            <button type="button" aria-label={c('delete')} onClick={() => run(() => deleteMedia(owner, video.id))} className="flex size-11 cursor-pointer items-center justify-center text-danger"><Trash2 size={18} /></button>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-sm leading-[22px]">{t('videoHint')}</p>
            <input
              type="file"
              accept="video/mp4,video/webm"
              aria-label={t('video')}
              className="input"
              onChange={(e) => {
                uploadFiles([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
            <div className="flex gap-2">
              <input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} aria-label={t('linkLabel')} placeholder={t('linkLabel')} className="input" />
              <Button type="button" variant="secondary" className="shrink-0" disabled={!videoLink} onClick={() => run(() => addMediaLink(owner, 'video', videoLink), () => setVideoLink(''))}>{t('addLink')}</Button>
            </div>
          </div>
        )}
      </div>

      {error && <Notice tone="error">{root(error)}</Notice>}
    </div>
  );
}
