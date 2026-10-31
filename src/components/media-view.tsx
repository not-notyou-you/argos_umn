'use client';

/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type MediaLike, embedUrl, imageUrl, videoFileUrl } from '@/lib/media-url';
import { CoverPlaceholderClient } from './cover-placeholder-client';

export type ViewItem = MediaLike & { id: string; altText: string | null; caption?: string; href?: string };

export function VideoPlayer({ item, title }: { item: ViewItem; title: string }) {
  const t = useTranslations('media');
  const [playing, setPlaying] = useState(false);

  if (item.source === 'upload' && item.storageKey) {
    return <video controls preload="metadata" src={videoFileUrl(item.storageKey)} className="aspect-video w-full rounded-md bg-ink" />;
  }
  if (playing) {
    return <iframe src={embedUrl(item) ?? undefined} title={title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen className="aspect-video w-full rounded-md bg-ink" />;
  }
  return (
    <button onClick={() => setPlaying(true)} aria-label={`${t('play')}: ${title}`} className="relative block w-full cursor-pointer overflow-hidden rounded-md">
      <CoverPlaceholderClient className="aspect-video w-full" />
      <span className="absolute inset-0 m-auto flex size-16 items-center justify-center rounded-full bg-brand-orange text-ink"><Play /></span>
    </button>
  );
}

export function Lightbox({ items, index, onClose, onMove }: { items: ViewItem[]; index: number; onClose: () => void; onMove: (i: number) => void }) {
  const t = useTranslations('media');
  const g = useTranslations('gallery');
  const ref = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const item = items[index];
  const move = useCallback((delta: number) => onMove((index + delta + items.length) % items.length), [index, items.length, onMove]);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'ArrowRight') move(1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
      className="on-dark m-0 size-full max-h-none max-w-none bg-ink/95 text-white backdrop:bg-ink"
    >
      <div className="flex h-full flex-col p-4">
        <div className="flex justify-end">
          <button aria-label={t('close')} onClick={onClose} className="flex size-11 cursor-pointer items-center justify-center"><X /></button>
        </div>
        <div className="flex min-h-0 flex-1 items-center gap-2">
          {items.length > 1 && <button aria-label={t('prev')} onClick={() => move(-1)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center"><ChevronLeft /></button>}
          <div className="flex h-full min-w-0 flex-1 items-center justify-center">
            {item.kind === 'image' && item.storageKey ? (
              <img src={imageUrl(item.storageKey, 1600)} alt={item.altText ?? ''} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="w-full max-w-4xl"><VideoPlayer key={item.id} item={item} title={item.altText ?? t('video')} /></div>
            )}
          </div>
          {items.length > 1 && <button aria-label={t('next')} onClick={() => move(1)} className="flex size-11 shrink-0 cursor-pointer items-center justify-center"><ChevronRight /></button>}
        </div>
        {item.caption && (
          <p className="pt-3 text-center">
            {item.href ? <Link href={item.href} className="underline">{g('viewSource')}: {item.caption}</Link> : item.caption}
          </p>
        )}
      </div>
    </dialog>
  );
}

/** Foto utama besar, thumbnail, lalu video. Tanpa foto, area utama memakai placeholder. */
export function MediaGrid({ items, name }: { items: ViewItem[]; name: string }) {
  const t = useTranslations('media');
  const photos = items.filter((m) => m.kind === 'image');
  const video = items.find((m) => m.kind === 'video');
  const [open, setOpen] = useState<number | null>(null);
  const alt = (item: ViewItem, n: number) => item.altText ?? `${name} ${n}`;
  const lightboxItems = photos.map((p, i) => ({ ...p, altText: alt(p, i + 1) }));

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 && (
        <ul className="grid auto-rows-[120px] grid-cols-2 gap-3 md:auto-rows-[190px] md:grid-cols-4">
          {photos.map((photo, i) => (
            <li key={photo.id} className={i === 0 ? 'col-span-2 row-span-2' : i % 5 === 3 ? 'md:col-span-2' : ''}>
              <button onClick={() => setOpen(i)} aria-label={t('open', { n: i + 1 })} className="group block size-full cursor-zoom-in overflow-hidden rounded-md">
                <img src={imageUrl(photo.storageKey!, i === 0 ? 960 : 480)} alt={alt(photo, i + 1)} loading="lazy" className="zoom-img size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {video && <VideoPlayer item={video} title={video.altText ?? name} />}
      {open !== null && <Lightbox items={lightboxItems} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </div>
  );
}

export function GalleryGrid({ items }: { items: ViewItem[] }) {
  const t = useTranslations('media');
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <ul className="columns-2 gap-3 md:columns-3 lg:columns-4">
        {items.map((item, i) => (
          <li key={item.id} className="mb-3 break-inside-avoid">
            <button onClick={() => setOpen(i)} aria-label={item.altText ?? item.caption ?? t('photo', { n: i + 1 })} className="group relative block w-full cursor-zoom-in overflow-hidden rounded-md">
              {item.kind === 'image' && item.storageKey ? (
                <img src={imageUrl(item.storageKey, 480)} alt={item.altText ?? item.caption ?? ''} loading="lazy" className="zoom-img w-full" />
              ) : (
                <>
                  <CoverPlaceholderClient className="aspect-video w-full" />
                  <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-brand-orange text-ink"><Play size={20} /></span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox items={items} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </>
  );
}
