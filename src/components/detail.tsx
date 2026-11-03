/* eslint-disable @next/next/no-img-element */
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { imageSrcSet, imageUrl } from '@/lib/media-url';
import { Avatar } from './display';
import { CoverPlaceholderClient } from './cover-placeholder-client';
import { MediaGrid, type ViewItem } from './media-view';
import { Container } from './ui';

type Person = { id: string; slug: string; fullName: string; photoKey: string | null; showPhoto: boolean };

export function DetailPage({
  backHref,
  backLabel,
  name,
  logoKey,
  badge,
  media,
  aboutLabel,
  description,
  mediaLabel,
  teamLabel,
  team,
  memberPrefix,
  actions,
  extra,
  placeholderSrc,
  next,
}: {
  backHref: string;
  backLabel: string;
  name: string;
  logoKey: string | null;
  badge: ReactNode;
  media: ViewItem[];
  aboutLabel: string;
  description: string;
  mediaLabel: string;
  teamLabel: string;
  team: Person[];
  memberPrefix: string;
  actions?: ReactNode;
  /** Bagian tambahan di bawah deskripsi, misalnya timeline project. */
  extra?: ReactNode;
  /** Gambar latar saat tidak ada cover; tanpa ini dipakai pola helm. */
  placeholderSrc?: string;
  next?: { href: string; name: string; label: string };
}) {
  const cover = media.find((m) => m.kind === 'image' && m.storageKey);
  return (
    <>
      <section className="on-dark relative isolate flex min-h-[62svh] items-end overflow-hidden bg-ink">
        {cover?.storageKey ? (
          <img src={imageUrl(cover.storageKey, 1600)} srcSet={imageSrcSet(cover.storageKey)} sizes="100vw" alt={cover.altText ?? name} className="media-loading ken-burns absolute inset-0 -z-20 size-full object-cover" />
        ) : placeholderSrc ? (
          <img src={placeholderSrc} alt="" className="absolute inset-0 -z-20 size-full object-cover object-bottom" />
        ) : (
          <CoverPlaceholderClient className="absolute inset-0 -z-20" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/20" />
        <Container className="pt-16 pb-10 md:pb-14">
          <Link href={backHref} className="font-semibold text-[#d8dbdf] hover:text-white">← {backLabel}</Link>
          <div className="mt-6 flex items-center gap-4">
            {logoKey && <img src={imageUrl(logoKey, 480)} alt="" className="size-14 rounded-md bg-white object-contain p-1.5 md:size-20" />}
            <h1 className="rise heading-xl max-w-[18ch] text-white">{name}</h1>
          </div>
          <div className="mt-5 text-white">{badge}</div>
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <section className="reveal min-w-0">
            <h2 className="label text-orange-text">{aboutLabel}</h2>
            <p className="prose-text mt-4 text-lg leading-8">{description}</p>
            {extra}
          </section>
          <aside className="flex flex-col gap-8">
            {actions}
            {team.length > 0 && (
              <section>
                <h2 className="label text-orange-text">{teamLabel}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {team.map((person) => (
                    <li key={person.id}>
                      <Link href={`${memberPrefix}/members/${person.slug}`} className="group flex items-center gap-3 font-semibold hover:text-teal-text">
                        <Avatar name={person.fullName} photoKey={person.showPhoto ? person.photoKey : null} size={44} />
                        {person.fullName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
        {media.length > 0 && (
          <section className="pt-16">
            <h2 className="label pb-4 text-orange-text">{mediaLabel}</h2>
            <MediaGrid items={media} name={name} />
          </section>
        )}
      </Container>

      {next && (
        <Link href={next.href} className="on-dark group block bg-ink py-12 text-white md:py-16">
          <Container className="flex items-center justify-between gap-4">
            <span>
              <span className="label block text-brand-orange">{next.label}</span>
              <span className="heading-xl mt-2 block text-white">{next.name}</span>
            </span>
            <ArrowRight aria-hidden size={40} className="shrink-0 transition-transform duration-300 group-hover:translate-x-2" />
          </Container>
        </Link>
      )}
    </>
  );
}
