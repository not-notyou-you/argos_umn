import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

/** Sudut dipotong (oktagon). `top` dan `bottom` boleh beda agar sudut dalam sejajar dengan pelat. */
const octagon = (top: string, bottom = top) =>
  `polygon(${top} 0, calc(100% - ${top}) 0, 100% ${top}, 100% calc(100% - ${bottom}), calc(100% - ${bottom}) 100%, ${bottom} 100%, 0 calc(100% - ${bottom}), 0 ${top})`;

/**
 * Sama dengan kartu project terbaru: border oranye BORDER, isi sewarna latar, foto berborder berputar PHOTO_BORDER.
 * Padding isi sama di semua sisi dan sama dengan jarak foto–label.
 * Potongan sudut lapisan dalam = potongan luar − jarak × tan(22,5°), supaya sisi miringnya berjarak sama.
 */
const PLATE_CUT = 52;
const BORDER = 8;
const PAD = 20;
const PHOTO_BORDER = 4;
const JOINT = 12;
const cut = (outer: number, inset: number) => `${(outer - inset * Math.tan(Math.PI / 8)).toFixed(2)}px`;

/** Kartu activity berbentuk oktagon: foto di atas, nama dan tanggal di label biru. Dipakai carousel beranda dan halaman aktivitas. */
export function ActivityPlate({
  href,
  name,
  date,
  cover,
  photoClassName = 'h-[clamp(160px,46vw,230px)]',
  className = '',
  style,
  ...link
}: {
  href: string;
  name: string;
  date: string;
  cover: ReactNode;
  /** Tinggi area foto. */
  photoClassName?: string;
  className?: string;
  style?: CSSProperties;
  tabIndex?: number;
  'aria-current'?: 'true';
}) {
  return (
    <Link
      href={href}
      {...link}
      className={`group block bg-brand-orange transition-transform duration-500 ease-out-expo hover:-translate-y-1 ${className}`}
      style={{ ...style, clipPath: octagon(cut(PLATE_CUT, 0)), padding: BORDER }}
    >
      <div className="bg-surface-muted" style={{ clipPath: octagon(cut(PLATE_CUT, BORDER)), padding: PAD }}>
        <div className="member-border" style={{ clipPath: octagon(cut(PLATE_CUT, BORDER + PAD), `${JOINT}px`), padding: PHOTO_BORDER }}>
          <div className={`overflow-hidden bg-teal-solid ${photoClassName}`} style={{ clipPath: octagon(cut(PLATE_CUT, BORDER + PAD + PHOTO_BORDER), cut(JOINT, PHOTO_BORDER)) }}>
            <div className="size-full transition-transform duration-700 ease-out-expo group-hover:scale-105 [&>*]:size-full">{cover}</div>
          </div>
        </div>
        <div className="flex h-[7rem] flex-col items-center justify-center gap-1 bg-brand-light-blue px-5 text-center text-black" style={{ clipPath: octagon(`${JOINT}px`, cut(PLATE_CUT, BORDER + PAD)), marginTop: PAD }}>
          <p className="line-clamp-2 text-[clamp(1.05rem,4.6vw,1.375rem)] leading-tight font-bold tracking-tight text-black">{name}</p>
          <p className="label text-black">{date}</p>
        </div>
      </div>
    </Link>
  );
}
