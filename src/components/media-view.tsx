'use client';

/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { type MediaLike, embedUrl, imageUrl, videoFileUrl } from '@/lib/media-url';
import { CoverPlaceholderClient } from './cover-placeholder-client';

export type ViewItem = MediaLike & { id: string; altText: string | null; caption?: string; href?: string; typeLabel?: string; dateLabel?: string; monthLabel?: string; yearLabel?: string };

export function VideoPlayer({ item, title }: { item: ViewItem; title: string }) {
  const t = useTranslations('media');
  const [playing, setPlaying] = useState(false);

  if (item.source === 'upload' && item.storageKey) {
    return <video controls preload="metadata" src={videoFileUrl(item.storageKey)} className="media-loading aspect-video w-full rounded-md" />;
  }
  if (playing) {
    return <iframe src={embedUrl(item) ?? undefined} title={title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen className="media-loading aspect-video w-full rounded-md" />;
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
    ref.current?.showModal();
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
          <div className="media-loading flex h-full min-w-0 flex-1 items-center justify-center bg-transparent!">
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
                <img src={imageUrl(photo.storageKey!, i === 0 ? 960 : 480)} alt={alt(photo, i + 1)} loading="lazy" className="media-loading zoom-img size-full object-cover" />
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

/** Modal detail: media di kiri, keterangan di kanan. */
function GalleryModal({ items, index, onClose, onMove }: { items: ViewItem[]; index: number; onClose: () => void; onMove: (i: number) => void }) {
  const t = useTranslations('media');
  const g = useTranslations('gallery');
  const ref = useRef<HTMLDialogElement>(null);
  const touchX = useRef<number | null>(null);
  const item = items[index];
  const move = useCallback((delta: number) => onMove((index + delta + items.length) % items.length), [index, items.length, onMove]);
  const title = item.caption ?? item.altText ?? t('photo', { n: index + 1 });

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') move(-1);
        if (e.key === 'ArrowRight') move(1);
      }}
      className="gallery-modal m-auto h-[min(760px,92svh)] w-[min(1160px,94vw)] max-w-none overflow-hidden rounded-md bg-surface text-brand-dark-gray backdrop:bg-ink/85 backdrop:backdrop-blur-sm"
    >
      <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_340px] md:grid-rows-1">
        <div
          className="on-dark relative flex min-h-0 items-center justify-center bg-ink"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) move(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {item.kind === 'image' && item.storageKey ? (
            <img key={item.id} src={imageUrl(item.storageKey, 1600)} alt={item.altText ?? item.caption ?? ''} className="media-loading size-full bg-transparent! object-contain" />
          ) : (
            <div className="w-full p-4"><VideoPlayer key={item.id} item={item} title={title} /></div>
          )}
          {items.length > 1 && (
            <>
              <button aria-label={t('prev')} onClick={() => move(-1)} className="absolute left-3 flex size-11 cursor-pointer items-center justify-center rounded-sm bg-ink/70 text-white transition-colors hover:bg-brand-orange hover:text-ink"><ChevronLeft /></button>
              <button aria-label={t('next')} onClick={() => move(1)} className="absolute right-3 flex size-11 cursor-pointer items-center justify-center rounded-sm bg-ink/70 text-white transition-colors hover:bg-brand-orange hover:text-ink"><ChevronRight /></button>
            </>
          )}
        </div>
        <div className="relative flex min-h-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-orange-text">{index + 1} / {items.length}</p>
            <button aria-label={t('close')} onClick={onClose} className="-m-2 flex size-11 cursor-pointer items-center justify-center text-heading"><X /></button>
          </div>
          <h2 className="text-2xl leading-8 font-bold">{title}</h2>
          <dl className="flex flex-col gap-3 text-sm leading-6">
            {item.typeLabel && <div><dt className="font-semibold text-heading">{g('type')}</dt><dd>{item.typeLabel}</dd></div>}
            {item.dateLabel && <div><dt className="font-semibold text-heading">{g('date')}</dt><dd>{item.dateLabel}</dd></div>}
            {item.altText && item.altText !== title && <div><dt className="font-semibold text-heading">{g('description')}</dt><dd>{item.altText}</dd></div>}
          </dl>
          {item.href && <Link href={item.href} className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-brand-orange px-4 font-semibold text-ink transition-colors hover:bg-[#f9a56d]">{g('viewSource')} <ArrowUpRight size={18} aria-hidden /></Link>}
        </div>
      </div>
    </dialog>
  );
}

/** Ukuran mosaik berulang tiap enam foto supaya tiap bulan terasa berbeda dari grid biasa. */
const TILE = ['col-span-2 row-span-2', '', '', 'md:col-span-2', 'md:row-span-2', 'col-span-2 md:col-span-1'];

export function GalleryGrid({ items }: { items: ViewItem[] }) {
  const t = useTranslations('media');
  const g = useTranslations('gallery');
  const [open, setOpen] = useState<number | null>(null);
  const groups = new Map<string, { month: string; year: string; entries: { item: ViewItem; index: number }[] }>();
  items.forEach((item, index) => {
    const key = `${item.monthLabel} ${item.yearLabel}`;
    if (!groups.has(key)) groups.set(key, { month: item.monthLabel ?? '', year: item.yearLabel ?? '', entries: [] });
    groups.get(key)!.entries.push({ item, index });
  });

  return (
    <>
      <div className="flex flex-col gap-16 md:gap-24">
        {[...groups].map(([key, group], groupIndex) => (
          <Fragment key={key}>
          {/* Pemisah antar-bulan, sama dengan pita di bawah hero beranda: oranye dengan garis miring hitam berjalan. */}
          {groupIndex > 0 && (
            <div aria-hidden className="full-bleed overflow-hidden bg-brand-orange py-4">
              <div className="marquee-track flex w-max">
                {Array.from({ length: 60 }, (_, i) => <span key={i} className="slash mr-6 shrink-0 bg-ink!" />)}
              </div>
            </div>
          )}
          <section className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
            <header className="self-start lg:sticky lg:top-[172px]">
              <h2 className="text-4xl leading-tight font-extrabold">{group.month}</h2>
              <p className="mt-1 text-lg font-bold text-orange-text">{group.year}</p>
              <p className="mt-2 text-sm">{g('count', { n: group.entries.length })}</p>
            </header>
            <ul className="reveal-items grid grid-flow-dense auto-rows-[150px] grid-cols-2 gap-3 md:auto-rows-[190px] md:grid-cols-4">
              {group.entries.map(({ item, index }, i) => (
                <li key={item.id} className={TILE[i % TILE.length]}>
                  <button onClick={() => setOpen(index)} aria-label={item.altText ?? item.caption ?? t('photo', { n: index + 1 })} className="group relative block size-full cursor-zoom-in overflow-hidden rounded-md">
                    {item.kind === 'image' && item.storageKey ? (
                      <img src={imageUrl(item.storageKey, 960)} alt="" loading="lazy" className="media-loading zoom-img size-full object-cover" />
                    ) : (
                      <>
                        <CoverPlaceholderClient className="size-full" />
                        <span className="absolute inset-0 m-auto flex size-12 items-center justify-center rounded-full bg-brand-orange text-ink"><Play size={20} /></span>
                      </>
                    )}
                    <span aria-hidden className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/90 to-transparent p-3 pt-10 text-left text-sm font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">{item.caption}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          </Fragment>
        ))}
      </div>
      {open !== null && <GalleryModal items={items} index={open} onClose={() => setOpen(null)} onMove={setOpen} />}
    </>
  );
}
