import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { DateTab as MeasuredTab } from './date-tab';

/**
 * Baris activity berbentuk panah. Semua ukuran dalam px kecuali lebar foto (--pw).
 * Koordinat x diukur dari kiri, dari kanan bila `r` benar, atau dari --tab (lebar tab tanggal) bila `t` benar,
 * jadi bentuk ikut lebar baris dan panjang tanggal.
 */
const H = 260; // tinggi kartu
const B = 8; // border oranye
const PAD = 18; // jarak isi ke border
const PB = 4; // border foto berputar
const TAB_TEXT_H = 22; // tinggi baris teks tanggal (text-lg tebal)
const TAB_PAD = 10; // jarak teks tanggal ke tepi tab, sama di keempat sisi
const TAB_Y = TAB_TEXT_H + 2 * TAB_PAD + 8; // tinggi undakan: tab + celah GAP (8) ke kartu
const TAB_SLANT = 26; // lebar sisi miring undakan
const TAB_NOMINAL = 220; // lebar tab contoh, hanya untuk menghitung arah sisi
const TIP = 60; // lebar ujung panah kanan
const NOTCH_X = 26; // kedalaman takik kiri tempat blok tahun mengunci
const NOTCH_H = 28; // setengah tinggi takik
const GAP = 8; // celah antar-bagian (tab, blok tahun), sama dengan border
const YEAR_W = 210; // lebar blok tahun tanpa tonjolan, cukup untuk 4 digit ukuran heading-xl
const YEAR_H = 110;

/** `b`: y diukur dari bawah (untuk kartu mobile yang tingginya mengikuti isi). */
type Pt = { x: number; y: number; r?: boolean; t?: boolean; b?: boolean };

const CARD: Pt[] = [
  { x: 0, y: TAB_Y },
  { x: 0, y: TAB_Y, t: true },
  { x: TAB_SLANT, y: 0, t: true },
  { x: TIP, y: 0, r: true },
  { x: 0, y: H / 2, r: true },
  { x: TIP, y: H, r: true },
  { x: 0, y: H },
  { x: 0, y: H / 2 + NOTCH_H },
  { x: NOTCH_X, y: H / 2 },
  { x: 0, y: H / 2 - NOTCH_H },
];

/** Geser tiap titik sejauh `d` ke dalam (vektor miter). Arah dihitung pada lebar contoh; sisi yang menghubungkan titik kiri dan kanan selalu mendatar, jadi arahnya tetap benar di lebar berapa pun. */
function inset(points: Pt[], d: number): Pt[] {
  const W = 1000;
  const HN = 1000;
  const abs = points.map((p) => [p.r ? W - p.x : p.t ? TAB_NOMINAL + p.x : p.x, p.b ? HN - p.y : p.y]);
  const n = abs.length;
  const area = abs.reduce((s, [x, y], i) => s + x * abs[(i + 1) % n][1] - abs[(i + 1) % n][0] * y, 0);
  const inward = (a: number[], b: number[]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(dx, dy);
    return area > 0 ? [-dy / len, dx / len] : [dy / len, -dx / len];
  };
  return points.map((p, i) => {
    const n1 = inward(abs[(i - 1 + n) % n], abs[i]);
    const n2 = inward(abs[i], abs[(i + 1) % n]);
    const k = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    const [mx, my] = [((n1[0] + n2[0]) / k) * d, ((n1[1] + n2[1]) / k) * d];
    return { x: p.r ? p.x - mx : p.x + mx, y: p.b ? p.y - my : p.y + my, r: p.r, t: p.t, b: p.b };
  });
}

const px = (p: Pt) => (p.r ? `calc(100% - ${p.x.toFixed(2)}px)` : p.t ? `calc(var(--tab) + ${p.x.toFixed(2)}px)` : `${p.x.toFixed(2)}px`);
const py = (p: Pt) => (p.b ? `calc(100% - ${p.y.toFixed(2)}px)` : `${p.y.toFixed(2)}px`);
const poly = (points: Pt[]) => `polygon(${points.map((p) => `${px(p)} ${py(p)}`).join(', ')})`;

/** Kartu mobile: undakan tab tanggal di kiri atas dan sudut kanan bawah terpotong; tingginya mengikuti isi. */
const CORNER = 32;
const MOBILE: Pt[] = [
  { x: 0, y: TAB_Y },
  { x: 0, y: TAB_Y, t: true },
  { x: TAB_SLANT, y: 0, t: true },
  { x: 0, y: 0, r: true },
  { x: 0, y: CORNER, r: true, b: true },
  { x: CORNER, y: 0, r: true, b: true },
  { x: 0, y: 0, b: true },
];

/** Foto berbentuk panah: sisi kiri pada lebar --pw dari kanan, ujungnya sejajar ujung kartu. */
function photoPoly(d: number, extraLeft = 0) {
  const [top, tip, bottom] = inset(CARD, d).slice(3, 6);
  const left = `calc(100% - var(--pw) + ${extraLeft}px)`;
  return `polygon(${left} ${d}px, ${px(top)} ${top.y.toFixed(2)}px, ${px(tip)} ${tip.y.toFixed(2)}px, ${px(bottom)} ${bottom.y.toFixed(2)}px, ${left} ${H - d}px)`;
}

// Tab tanggal: sisi kanan sejajar sisi miring undakan, berjarak GAP tegak lurus.
const SLOPE = TAB_SLANT / TAB_Y;
const TAB_RIGHT = TAB_SLANT - GAP * Math.hypot(1, SLOPE); // relatif terhadap --tab
const TAB_H = TAB_Y - GAP;
const DATE_TAB = `polygon(0 0, calc(var(--tab) + ${TAB_RIGHT.toFixed(2)}px) 0, calc(var(--tab) + ${(TAB_RIGHT - TAB_H * SLOPE).toFixed(2)}px) ${TAB_H}px, 0 ${TAB_H}px)`;
/**
 * Lebar tab mengikuti panjang tanggal: huruf kapital Montserrat tebal dengan jarak huruf ± 1,08ch per karakter
 * (diukur di browser; ch pada ukuran huruf tab, text-lg). Ditambah TAB_PAD kiri dan kanan, dengan jarak kanan
 * diukur pada setengah tinggi tab karena sisi kanannya miring.
 */
const TAB_EXTRA = 2 * TAB_PAD - TAB_RIGHT + (TAB_H / 2) * SLOPE;
/** Perkiraan untuk render awal; DateTab menggantinya dengan lebar teks yang diukur. */
const tabWidth = (text: string) => `calc(${(text.length * 1.08).toFixed(2)}ch + ${TAB_EXTRA.toFixed(2)}px)`;

// Blok tahun: tonjolan kanan sejajar takik kartu, berjarak GAP tegak lurus.
const NOTCH_SLOPE = NOTCH_X / NOTCH_H;
const SHIFT = GAP * Math.hypot(1, NOTCH_SLOPE);
const TONGUE_X = YEAR_W + GAP + NOTCH_X - SHIFT;
const TONGUE_H = NOTCH_H - (SHIFT - GAP) / NOTCH_SLOPE;
const YEAR_BLOCK = `polygon(0 0, ${YEAR_W}px 0, ${YEAR_W}px ${(YEAR_H / 2 - TONGUE_H).toFixed(2)}px, ${TONGUE_X.toFixed(2)}px ${YEAR_H / 2}px, ${YEAR_W}px ${(YEAR_H / 2 + TONGUE_H).toFixed(2)}px, ${YEAR_W}px ${YEAR_H}px, 0 ${YEAR_H}px)`;

/** Lebar kolom tahun: blok tahun lalu celah ke kartu. Tonjolan blok masuk ke takik kartu. */
export const YEAR_COLUMN = YEAR_W + GAP;
/** Jarak dari atas kartu ke atas blok tahun saat keduanya sejajar. */
export const YEAR_OFFSET = H / 2 - YEAR_H / 2;
export const CARD_H = H;

/**
 * Blok tahun, satu per tahun. Menempel (sticky) di kolom kiri dan mengunci ke takik kartu
 * yang sedang sejajar dengannya; halaman berhenti per kartu (scroll-snap) sehingga terasa "klik".
 */
export function YearTag({ year, top }: { year: string; top: number }) {
  return (
    <div className="sticky z-20 hidden md:block" style={{ top: top + YEAR_OFFSET, marginTop: YEAR_OFFSET, width: TONGUE_X + 1, height: YEAR_H }}>
      <div className="size-full bg-brand-orange" style={{ clipPath: YEAR_BLOCK }}>
        <span className="heading-xl flex h-full items-center justify-center text-black" style={{ width: YEAR_W }}>{year}</span>
      </div>
    </div>
  );
}

function DateTab({ day }: { day: string }) {
  return (
    <MeasuredTab
      day={day}
      extra={TAB_EXTRA}
      className="absolute top-0 left-0 z-[1] flex items-center bg-brand-light-blue text-lg leading-[22px] font-extrabold tracking-[0.08em] whitespace-nowrap text-black uppercase" style={{ height: TAB_H, paddingLeft: TAB_PAD, width: `calc(var(--tab) + ${TAB_RIGHT}px)`, clipPath: DATE_TAB }}
    />
  );
}

/**
 * Satu activity. Layar lebar: baris berbentuk panah dengan foto di ujung kanan.
 * Layar sempit: kartu tegak (foto di atas, teks di bawah) dengan tab tanggal yang sama.
 * Semua isi berjarak PAD dari border oranye.
 */
export function ActivityRow({ href, day, title, excerpt, cover }: { href: string; day: string; title: string; excerpt: string; cover: ReactNode }) {
  return (
    <article data-tab-host className="reveal relative text-lg" style={{ '--pw': 'min(420px, 48%)', '--tab': tabWidth(day) } as CSSProperties}>
      <div className="relative hidden md:block" style={{ height: H }}>
        <DateTab day={day} />
        <div className="absolute inset-0 bg-brand-orange" style={{ clipPath: poly(CARD) }} />
        <div className="absolute inset-0 bg-surface-muted" style={{ clipPath: poly(inset(CARD, B)) }} />
        <div className="member-border absolute inset-0" style={{ clipPath: photoPoly(B + PAD) }} />
        <div className="absolute inset-0 overflow-hidden bg-teal-solid" style={{ clipPath: photoPoly(B + PAD + PB, PB) }}>
          <div className="absolute inset-y-0 right-0 [&>*]:size-full" style={{ width: 'var(--pw)' }}>{cover}</div>
        </div>
        {/* Isi kartu mengikuti tema (surface-muted), jadi teksnya memakai warna judul dan teks tema. */}
        <div className="absolute flex flex-col justify-center" style={{ top: TAB_Y + B + PAD, bottom: B + PAD, left: NOTCH_X + B + PAD, right: `calc(var(--pw) + ${PAD}px)` }}>
          <h3 className="line-clamp-2 text-[clamp(1.1rem,2.2vw,1.75rem)] leading-tight font-bold text-heading">{title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-5">{excerpt}</p>
        </div>
      </div>

      <div className="relative md:hidden" style={{ padding: `${TAB_Y + B + PAD}px ${B + PAD}px ${B + PAD + CORNER / 2}px` }}>
        <DateTab day={day} />
        <div className="absolute inset-0 bg-brand-orange" style={{ clipPath: poly(MOBILE) }} />
        <div className="absolute inset-0 bg-surface-muted" style={{ clipPath: poly(inset(MOBILE, B)) }} />
        <div className="member-border relative" style={{ padding: PB }}>
          <div className="aspect-[16/10] overflow-hidden bg-teal-solid [&>*]:size-full">{cover}</div>
        </div>
        <h3 className="relative mt-4 text-xl leading-tight font-bold text-heading">{title}</h3>
        <p className="relative mt-2 line-clamp-3 text-sm leading-5">{excerpt}</p>
      </div>

      {/* Seluruh kartu bisa diklik. */}
      <Link href={href} aria-label={title} className="absolute inset-0 z-10" />
    </article>
  );
}
