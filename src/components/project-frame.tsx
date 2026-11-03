import type { ProjectStatus } from '@/db/schema';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { excerpt } from '@/lib/util';
import { Cover } from './display';

/**
 * Pelat bertakik di kiri atas: border oranye BORDER, lalu isi sewarna latar.
 * Semua jarak di dalam isi (tepi, foto–deskripsi, takik, label status) sama dengan PAD.
 */
const BORDER = 8;
/** Border foto berputar, sama dengan kartu member tetapi lebih tebal. */
const PHOTO_BORDER = 4;
const PAD = 22;
const NOTCH_Y = 36;
const NOTCH_X = 72;
const NOTCH_SLANT = 16;
const NOTCH_SLOPE = NOTCH_SLANT / NOTCH_Y;

/** Geser mendatar agar jarak tegak lurus ke sisi miring sama dengan `gap`. `slope` = geser mendatar per 1px tinggi. */
const across = (gap: number, slope: number) => gap * Math.hypot(1, slope);
/** Takik pelat yang masuk sejauh `inset` ke dalam, dalam koordinat lapisan itu sendiri. */
const notch = (inset: number) => {
  const x = NOTCH_X - inset * NOTCH_SLOPE + across(inset, NOTCH_SLOPE) - inset;
  return `polygon(0 ${NOTCH_Y}px, ${x}px ${NOTCH_Y}px, ${x + NOTCH_SLANT}px 0, 100% 0, 100% 100%, 0 100%)`;
};

/**
 * Label status menancap di sudut kanan bawah foto. Pita di atas dan kirinya setebal PAD,
 * dan sisi miring pita sejajar dengan sisi miring label.
 */
const LABEL_H = 32;
const LABEL_SLOPE = 0.45;
const slant = (height: number) => `polygon(${height * LABEL_SLOPE}px 0, 100% 0, 100% 100%, 0 100%)`;

/** Kartu project terbaru: foto bertakik, label status di sudut kanan bawah foto, deskripsi di pita biru. */
export function ProjectFrame({
  href,
  name,
  description,
  coverKey,
  status,
  sizes = '(min-width: 640px) 50vw, 100vw',
}: {
  href: string;
  name: string;
  description: string;
  coverKey: string | null;
  sizes?: string;
  status: ProjectStatus;
}) {
  const t = useTranslations('status');
  return (
    <article className="group reveal relative h-full transition-transform duration-500 ease-out-expo hover:-translate-y-1">
      <div className="h-full bg-brand-orange" style={{ clipPath: notch(0), padding: BORDER }}>
        <div className="flex h-full flex-col bg-surface-muted" style={{ clipPath: notch(BORDER), padding: PAD }}>
          <div className="relative">
            <div className="member-border" style={{ clipPath: notch(BORDER + PAD), padding: PHOTO_BORDER }}>
              <div className="overflow-hidden bg-white" style={{ clipPath: notch(BORDER + PAD + PHOTO_BORDER) }}>
                <Cover storageKey={coverKey} alt="" sizes={sizes} className="zoom-img aspect-[16/9] w-full" kind="project" seed={name} />
              </div>
            </div>
            <span className="absolute right-0 bottom-0 bg-surface-muted" style={{ clipPath: slant(LABEL_H + PAD), paddingTop: PAD, paddingLeft: across(PAD, LABEL_SLOPE) }}>
              <span className="flex items-center bg-brand-light-blue pr-4 text-sm font-extrabold tracking-wide text-black uppercase" style={{ clipPath: slant(LABEL_H), height: LABEL_H, paddingLeft: LABEL_H * LABEL_SLOPE + 10 }}>
                {t(status)}
              </span>
            </span>
          </div>
          <div className="flex-1 bg-brand-light-blue px-5 py-4 text-black" style={{ marginTop: PAD }}>
            <h3 className="text-lg leading-6 font-bold text-black">
              <Link href={href} className="text-black after:absolute after:inset-0">{name}</Link>
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-black">{excerpt(description, 140)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
