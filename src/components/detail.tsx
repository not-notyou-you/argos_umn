/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { imageUrl } from '@/lib/media-url';
import { Avatar } from './display';
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
  teamLabel,
  team,
  memberPrefix,
  actions,
}: {
  backHref: string;
  backLabel: string;
  name: string;
  logoKey: string | null;
  badge: ReactNode;
  media: ViewItem[];
  aboutLabel: string;
  description: string;
  teamLabel: string;
  team: Person[];
  memberPrefix: string;
  actions?: ReactNode;
}) {
  return (
    <Container className="py-8 md:py-12">
      <Link href={backHref} className="font-semibold text-teal-text">← {backLabel}</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <div className="flex items-center gap-3">
          {logoKey && <img src={imageUrl(logoKey, 480)} alt="" className="size-14 rounded-sm object-contain" />}
          <h1 className="text-[30px] leading-[38px] font-bold md:text-[40px] md:leading-[48px]">{name}</h1>
        </div>
        {badge}
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          <MediaGrid items={media} name={name} />
          <section>
            <h2 className="text-[22px] leading-[30px] font-semibold">{aboutLabel}</h2>
            <p className="prose-text mt-3">{description}</p>
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          {actions}
          {team.length > 0 && (
            <section>
              <h2 className="label text-orange-text">{teamLabel}</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {team.map((person) => (
                  <li key={person.id}>
                    <Link href={`${memberPrefix}/members/${person.slug}`} className="flex items-center gap-3 font-semibold hover:text-teal-text">
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
    </Container>
  );
}
