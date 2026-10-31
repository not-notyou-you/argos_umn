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
  const dot = { done: 'bg-teal-solid', on_progress: 'bg-brand-orange', cancelled: 'bg-brand-light-gray' }[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-sm border bg-surface px-2 py-0.5 text-sm font-semibold ${tone}`}>
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
      className={`media-loading object-cover ${className}`}
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

/** Foto potret penuh. Tanpa foto, inisial di atas pola garis. */
export function MemberPortrait({ name, photoKey, showInitials = false }: { name: string; photoKey: string | null; showInitials?: boolean }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return photoKey ? (
    <span className="member-photo absolute inset-0">
      <img src={imageUrl(photoKey, 960)} alt="" loading="lazy" className="media-loading zoom-img size-full object-cover" />
    </span>
  ) : (
    <span aria-hidden className="slash-bg absolute inset-0 flex items-center justify-center">
      <Helmet className="absolute -right-[18%] -bottom-[8%] w-[90%] text-white/[0.05]" />
      <span className={`${showInitials ? 'block' : 'hidden sm:block'} pb-16 text-[clamp(3rem,7vw,5rem)] leading-none font-extrabold tracking-tight text-white/90`}>{initials}</span>
    </span>
  );
}

/** Kartu awak kapal dengan nomor urut. */
export function MemberCard({ href, index, name, photoKey, position, line }: { href: string; index: number; name: string; photoKey: string | null; position?: string; line?: string }) {
  return (
    <Link href={href} className="member-card group on-dark cut-corner relative block aspect-[3/4] overflow-hidden bg-ink text-white">
      <MemberPortrait name={name} photoKey={photoKey} />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
      <span aria-hidden className="absolute top-3 left-4 text-sm font-bold text-white/80">{String(index).padStart(2, '0')}</span>
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-3 pr-6 md:p-4 md:pr-7">
        {position && <span className="label text-brand-orange">{position}</span>}
        <span className="text-base leading-5 font-bold tracking-tight md:text-xl md:leading-6">{name}</span>
        {line && <span className="truncate text-xs leading-5 text-[#d3d6da] md:text-sm">{line}</span>}
      </span>
      <span aria-hidden className="member-frame absolute inset-0 bg-brand-orange" />
    </Link>
  );
}

export function Avatar({ name, photoKey, size = 96 }: { name: string; photoKey: string | null; size?: number }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <div style={{ width: size, height: size }} className="member-photo hexagon flex shrink-0 items-center justify-center bg-teal-solid font-bold text-white transition-colors group-hover:bg-orange-text">
      {photoKey ? (
        <img src={imageUrl(photoKey, 480)} alt="" className="media-loading size-full object-cover" loading="lazy" />
      ) : (
        <span style={{ fontSize: size / 3 }} aria-hidden>{initials}</span>
      )}
    </div>
  );
}
