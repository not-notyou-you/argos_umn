/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ProjectStatus } from '@/db/schema';
import { imageSrcSet, imageUrl } from '@/lib/media-url';
import { excerpt } from '@/lib/util';
import { Helmet } from './helmet';

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const t = useTranslations('status');
  const tone = {
    open: 'border-dashed border-teal-text text-teal-text',
    done: 'border-teal-text text-teal-text',
    on_progress: 'border-orange-text text-orange-text',
    cancelled: 'border-brand-dark-gray text-brand-dark-gray',
  }[status];
  const dot = { open: 'bg-brand-light-blue', done: 'bg-teal-solid', on_progress: 'bg-brand-orange', cancelled: 'bg-brand-light-gray' }[status];
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

const PROJECT_PLACEHOLDERS = ['/brand/bg/day.webp', '/brand/bg/night.webp'];

/**
 * Latar siang atau malam untuk project tanpa gambar. Dipilih dari hash nama, jadi
 * tampak acak antar project tetapi tetap sama di setiap halaman dan render.
 */
export function projectPlaceholder(seed = '') {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return PROJECT_PLACEHOLDERS[Math.abs(hash) % PROJECT_PLACEHOLDERS.length];
}

export const ACTIVITY_PLACEHOLDER = '/brand/bg/dawn.webp';

/** Sampul tanpa gambar: ilustrasi (siang/malam untuk project, fajar untuk activity) dengan judul di atasnya. */
function ScenePlaceholder({ src, label, title, className = '' }: { src: string; label: string; title?: string; className?: string }) {
  return (
    <div className={`@container relative overflow-hidden bg-ink text-white ${className}`}>
      <img src={src} alt="" loading="lazy" className="absolute inset-0 size-full object-cover object-bottom" />
      {title && (
        <div className="absolute inset-x-0 top-0 hidden bg-gradient-to-b from-ink/80 via-ink/40 to-transparent px-[7%] pt-[6%] pb-[14%] @min-[200px]:block">
          <p className="label text-brand-orange">{label}</p>
          <p className="mt-1 line-clamp-2 text-[clamp(1rem,7cqw,1.75rem)] leading-tight font-bold tracking-tight">{title}</p>
        </div>
      )}
    </div>
  );
}

export type CoverKind = 'project' | 'activity';

/** `seed` memilih latar placeholder project bila judul sengaja tidak ditampilkan di sampul. */
export function Cover({ storageKey, alt, sizes, className = '', kind, title, seed }: { storageKey: string | null; alt: string; sizes: string; className?: string; kind?: CoverKind; title?: string; seed?: string }) {
  const t = useTranslations('placeholder');
  if (!storageKey) {
    if (kind) {
      const src = kind === 'project' ? projectPlaceholder(seed ?? title) : ACTIVITY_PLACEHOLDER;
      return <ScenePlaceholder src={src} label={t(kind)} title={title} className={className} />;
    }
    return <CoverPlaceholder className={className} />;
  }
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
  kind,
}: {
  href: string;
  name: string;
  description: string;
  coverKey: string | null;
  logoKey: string | null;
  meta?: React.ReactNode;
  kind?: CoverKind;
}) {
  return (
    <article className="group reveal relative flex h-full flex-col">
      <div className="relative overflow-hidden rounded-md">
        <Cover storageKey={coverKey} alt="" sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw" className="zoom-img aspect-[4/3] w-full" kind={kind} title={name} />
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

const POSES = ['jotaro', 'dio', 'josuke', 'giorno', 'joseph', 'polnareff', 'kakyoin', 'caesar'];

/** Pose diundi ulang setiap request. Aman karena halaman member selalu dirender di server (force-dynamic). */
function randomPose() {
  return POSES[Math.floor(Math.random() * POSES.length)];
}

/** Foto potret penuh. Tanpa foto, kartu ID: pose maskot dengan inisial besar di belakangnya. */
export function MemberPortrait({ name, photoKey }: { name: string; photoKey: string | null }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return photoKey ? (
    <span className="member-photo absolute inset-0">
      <img src={imageUrl(photoKey, 960)} alt="" loading="lazy" className="media-loading member-zoom size-full object-cover" />
    </span>
  ) : (
    <span aria-hidden className="@container absolute inset-0 block overflow-hidden bg-[#3a3d43] bg-[radial-gradient(rgb(255_255_255/0.16)_1px,transparent_1px)] bg-size-[14px_14px]">
      <span className="member-zoom-initials absolute inset-x-0 top-[4%] text-center text-[46cqw] leading-none font-extrabold tracking-tighter text-brand-orange">{initials}</span>
      <img src={`/brand/mascot/profil/${randomPose()}.webp`} alt="" loading="lazy" className="member-zoom absolute top-[20%] left-1/2 h-[88%] w-auto max-w-none -translate-x-1/2 object-contain" />
    </span>
  );
}

/** Kartu awak kapal. Border 4px bergradasi yang berputar mengelilingi isi kartu. */
export function MemberCard({ href, name, photoKey, position, line }: { href: string; index: number; name: string; photoKey: string | null; position?: string; line?: string }) {
  return (
    <Link href={href} className="member-card member-border group on-dark cut-corner relative block aspect-[3/4] overflow-hidden text-white">
      <span className="cut-corner absolute overflow-hidden bg-ink" style={{ inset: 4 }}>
      <MemberPortrait name={name} photoKey={photoKey} />
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/60 p-3 pr-6 backdrop-blur-md md:p-4 md:pr-7">
        {position && <span className="label text-brand-orange">{position}</span>}
        <span className="text-base leading-5 font-bold tracking-tight md:text-xl md:leading-6">{name}</span>
        {line && <span className="truncate text-xs leading-5 text-[#d3d6da] md:text-sm">{line}</span>}
      </span>
      </span>
      <span aria-hidden className="member-frame absolute inset-0 bg-brand-orange" />
    </Link>
  );
}

export function Avatar({ name, photoKey, size = 96 }: { name: string; photoKey: string | null; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="member-photo hexagon flex shrink-0 items-center justify-center bg-teal-solid font-bold text-white transition-colors group-hover:bg-orange-text">
      {photoKey ? (
        <img src={imageUrl(photoKey, 480)} alt="" className="media-loading size-full object-cover" loading="lazy" />
      ) : (
        <img src="/brand/mascot/kepala.webp" alt={name} loading="lazy" className="size-[72%] object-contain" />
      )}
    </div>
  );
}
