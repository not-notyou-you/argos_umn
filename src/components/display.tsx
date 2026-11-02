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

/** Sampul project tanpa gambar: maskot di atas kisi blueprint. */
function BlueprintPlaceholder({ title, className = '' }: { title?: string; className?: string }) {
  const t = useTranslations('placeholder');
  return (
    <div className={`@container blueprint-grid relative overflow-hidden bg-ink text-white ${className}`}>
      <span aria-hidden className="absolute top-2 left-2 size-4 border-t-2 border-l-2 border-brand-light-blue/60" />
      <span aria-hidden className="absolute right-2 bottom-2 size-4 border-r-2 border-b-2 border-brand-light-blue/60" />
      <img src="/brand/mascot/samping.webp" alt="" loading="lazy" className="absolute right-[5%] -bottom-[6%] h-[100%] w-auto" />
      {title && (
        <div className="absolute top-[12%] left-[7%] hidden w-[52%] @min-[200px]:block">
          <p className="label text-brand-orange">{t('project')}</p>
          <p className="mt-1 line-clamp-3 text-[clamp(1rem,8cqw,2rem)] leading-tight font-bold tracking-tight">{title}</p>
        </div>
      )}
    </div>
  );
}

/** Sampul activity tanpa gambar: bingkai foto bertumpuk, menunggu foto diunggah. */
function PolaroidPlaceholder({ title, className = '' }: { title?: string; className?: string }) {
  const t = useTranslations('placeholder');
  return (
    <div className={`@container dot-bg relative flex flex-col items-center justify-center gap-[4%] overflow-hidden bg-surface-muted p-[4%] ${className}`}>
      <div aria-hidden className="relative aspect-[5/6] h-[74%] min-h-0">
        <span className="absolute inset-0 rotate-[5deg] rounded-sm bg-white shadow-md" />
        <span className="absolute inset-0 flex -rotate-[4deg] flex-col rounded-sm bg-white p-[6%] shadow-lg">
          <img src="/brand/mascot/good.webp" alt="" loading="lazy" className="min-h-0 w-full flex-1 object-cover" />
          <span className="pt-1 text-center text-[clamp(0.55rem,3.6cqw,0.85rem)] leading-tight font-bold text-ink">{t('photoSoon')}</span>
        </span>
      </div>
      {title && <p className="hidden w-full truncate text-center text-[clamp(0.8rem,4.6cqw,1.1rem)] font-bold text-heading @min-[200px]:block">{title}</p>}
    </div>
  );
}

export type CoverKind = 'project' | 'activity';

export function Cover({ storageKey, alt, sizes, className = '', kind, title }: { storageKey: string | null; alt: string; sizes: string; className?: string; kind?: CoverKind; title?: string }) {
  if (!storageKey) {
    if (kind === 'project') return <BlueprintPlaceholder title={title} className={className} />;
    if (kind === 'activity') return <PolaroidPlaceholder title={title} className={className} />;
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

/** Kartu awak kapal. Border 2px bergradasi yang berputar mengelilingi isi kartu. */
export function MemberCard({ href, name, photoKey, position, line }: { href: string; index: number; name: string; photoKey: string | null; position?: string; line?: string }) {
  return (
    <Link href={href} className="member-card member-border group on-dark cut-corner relative block aspect-[3/4] overflow-hidden text-white">
      <span className="cut-corner absolute inset-[2px] overflow-hidden bg-ink">
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
