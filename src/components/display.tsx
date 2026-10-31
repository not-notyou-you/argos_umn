/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { imageSrcSet, imageUrl } from '@/lib/media-url';
import { excerpt } from '@/lib/util';
import { Helmet } from './helmet';

export function StatusBadge({ status }: { status: 'done' | 'on_progress' | 'cancelled' }) {
  const t = useTranslations('status');
  const tone = {
    done: 'border-teal-text text-teal-text',
    on_progress: 'border-orange-text text-orange-text',
    cancelled: 'border-brand-dark-gray text-brand-dark-gray',
  }[status];
  const dot = { done: 'bg-teal-text', on_progress: 'bg-brand-orange', cancelled: 'bg-brand-light-gray' }[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-sm border bg-white px-2 py-0.5 text-sm font-semibold ${tone}`}>
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {t(status)}
    </span>
  );
}

export function CoverPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`slash-bg flex items-center justify-center bg-ink text-white ${className}`}>
      <Helmet className="h-2/5 max-h-32 w-auto opacity-90" />
    </div>
  );
}

export function Cover({ storageKey, alt, sizes, className = '' }: { storageKey: string | null; alt: string; sizes: string; className?: string }) {
  if (!storageKey) return <CoverPlaceholder className={className} />;
  return (
    <img
      src={imageUrl(storageKey)}
      srcSet={imageSrcSet(storageKey)}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}

export function ContentCard({
  href,
  name,
  description,
  coverKey,
  logoKey,
  meta,
}: {
  href: string;
  name: string;
  description: string;
  coverKey: string | null;
  logoKey: string | null;
  meta?: React.ReactNode;
}) {
  return (
    <article className="group reveal relative flex h-full flex-col">
      <div className="relative overflow-hidden rounded-md">
        <Cover storageKey={coverKey} alt="" sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw" className="zoom-img aspect-[4/3] w-full" />
        <span aria-hidden className="absolute top-3 right-3 flex size-10 translate-y-1 items-center justify-center rounded-full bg-brand-orange text-ink opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 pt-4">
        <div className="flex items-center gap-2">
          {logoKey && <img src={imageUrl(logoKey, 480)} alt="" className="size-8 rounded-sm object-contain" />}
          <h3 className="text-[22px] leading-7 font-bold">
            <Link href={href} className="after:absolute after:inset-0 group-hover:text-teal-text">{name}</Link>
          </h3>
        </div>
        <p className="line-clamp-2 flex-1">{excerpt(description)}</p>
        {meta && <div className="pt-1">{meta}</div>}
      </div>
    </article>
  );
}

export function Avatar({ name, photoKey, size = 96 }: { name: string; photoKey: string | null; size?: number }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size }} className="member-photo hexagon flex shrink-0 items-center justify-center bg-teal-text font-bold text-white transition-colors group-hover:bg-orange-text">
      {photoKey ? (
        <img src={imageUrl(photoKey, 480)} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span style={{ fontSize: size / 3 }} aria-hidden>{initials}</span>
      )}
    </div>
  );
}
