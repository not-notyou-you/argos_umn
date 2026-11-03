'use client';

import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { flushSync } from 'react-dom';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityPlate } from './activity-plate';

export type ChainItem = { id: string; href: string; name: string; date: string; cover: ReactNode };

/** Daftar digandakan tiga kali; pengguna selalu dikembalikan ke salinan tengah agar terasa tanpa ujung. */
const COPIES = 3;

/** Posisi kartu tanpa pergeseran `left` (yang ikut dihitung offsetLeft). */
const baseLeft = (card: HTMLElement) => card.offsetLeft - (parseFloat(getComputedStyle(card).left) || 0);
/** Lompatan ditunda sampai transisi lebar/geser (500ms) selesai, supaya tidak ada animasi yang terpotong. */
const SETTLE_MS = 560;

/**
 * Penjepit berbentuk tulang: isi sewarna latar, tepi oranye 8px, lalu tepi luar sewarna latar 8px.
 * Kedua tepi digambar di bawah isi (paint-order), jadi lebar stroke = 2 × tebal yang terlihat.
 * viewBox 120×140 dengan x 40–80 sebagai celah (2.5rem). Semua penjepit sama, tidak bergantung kartu aktif.
 */
const CONNECTOR_PATH = 'M38 14H52L57 34H63L68 14H82V45H77L72 57V83L77 95H82V126H68L63 106H57L52 126H38V95H43L48 83V57L43 45H38Z';

function Connector() {
  return (
    <svg aria-hidden viewBox="0 0 120 140" className="pointer-events-none absolute top-1/2 left-[calc(100%-2.5rem)] z-10 w-[7.5rem] -translate-y-1/2 overflow-visible">
      <path d={CONNECTOR_PATH} fill="none" stroke="var(--color-surface-muted)" strokeWidth="32" strokeLinejoin="round" />
      <path d={CONNECTOR_PATH} fill="var(--color-surface-muted)" stroke="var(--color-brand-orange)" strokeWidth="16" strokeLinejoin="round" paintOrder="stroke" />
    </svg>
  );
}

export function ActivityChain({ items, label }: { items: ChainItem[]; label: string }) {
  const t = useTranslations('home');
  const track = useRef<HTMLUListElement>(null);
  const n = items.length;
  const loop = n > 1;
  const all = loop
    ? Array.from({ length: COPIES }, (_, c) => items.map((item, i) => ({ item, key: `${c}-${item.id}`, clone: c !== 1, idx: c * n + i }))).flat()
    : items.map((item, i) => ({ item, key: item.id, clone: false, idx: i }));
  const [active, setActive] = useState(loop ? n + 1 : 0);
  const [jumping, setJumping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  const center = useCallback((i: number, smooth: boolean) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: baseLeft(card) + card.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Posisi awal: kartu kedua di salinan tengah, sehingga kedua sisi terisi.
  useLayoutEffect(() => center(active, false), [center]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const nearest = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let dist = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const card = c as HTMLElement;
        const d = Math.abs(baseLeft(card) + card.offsetWidth / 2 - mid);
        if (d < dist) [best, dist] = [i, d];
      });
      return best;
    };
    let timer: ReturnType<typeof setTimeout>;
    const settle = () => {
      const i = nearest();
      if (!loop || (i >= n && i < 2 * n)) return;
      // Lompat ke kartu yang sama di salinan tengah. Geometri li tidak bergantung pada kartu aktif,
      // jadi menggeser scroll sejauh jarak antar-salinan menghasilkan gambar yang identik.
      const same = n + (i % n);
      const from = el.children[i] as HTMLElement;
      const to = el.children[same] as HTMLElement;
      flushSync(() => setJumping(true));
      el.scrollLeft += baseLeft(to) - baseLeft(from);
      flushSync(() => setActive(same));
      requestAnimationFrame(() => requestAnimationFrame(() => setJumping(false)));
    };
    const onScroll = () => {
      setActive(nearest());
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };
    const onEnd = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };
    el.addEventListener('scrollend', onEnd);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
    };
  }, [n, loop, center]);

  // Roda mouse: satu takik = satu kartu. Tanpa jeda, satu gesekan trackpad akan melompati banyak kartu.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      const next = activeRef.current + Math.sign(delta);
      if (!loop && (next < 0 || next > n - 1)) return;
      e.preventDefault();
      const now = performance.now();
      if (now - last < 450) return;
      last = now;
      center(next, true);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [n, loop, center]);

  // Seret dengan mouse. Sentuh sudah ditangani scroll bawaan browser.
  const drag = useRef({ x: 0, left: 0, moved: false });
  const onPointerDown = (e: React.PointerEvent) => {
    const el = track.current;
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - drag.current.x;
      if (!drag.current.moved && Math.abs(dx) < 6) return;
      if (!drag.current.moved) setDragging(true);
      drag.current.moved = true;
      el.scrollLeft = drag.current.left - dx;
    };
    const onUp = () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', onUp);
      if (!drag.current.moved) return;
      setDragging(false);
      center(activeRef.current, true);
    };
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', onUp);
  };
  // Klik yang mengakhiri seretan tidak boleh membuka kartu.
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  const shown = loop ? active % n : active;
  const control = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-extrabold tracking-[0.18em] text-heading uppercase transition-opacity hover:opacity-70 disabled:opacity-30';

  return (
    <div>
      <ul
        ref={track}
        tabIndex={0}
        aria-label={label}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}
        className={`reveal isolate flex cursor-grab gap-10 select-none ${dragging ? 'cursor-grabbing' : 'snap-x snap-mandatory'} overflow-x-auto px-[calc(50%-min(35vw,182px))] py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${jumping ? '[&_*]:transition-none!' : ''}`}
      >
        {all.map(({ item, key, clone, idx }) => {
          const isActive = idx === active;
          return (
            <li
              key={key}
              aria-hidden={clone || undefined}
              className="relative w-[70vw] max-w-[364px] shrink-0 snap-center transition-[left] duration-500 ease-out-expo"
              style={{ left: idx < active ? '-20%' : idx > active ? '20%' : '0' }}
            >
              {/* Tetangga digeser dengan `left`, bukan transform: transform membuat konteks tumpukan per kartu sehingga pengait bisa tertimpa. */}
              {/* Lapisan dalam melebar 40% (20% tiap sisi); geometri scroll dihitung tanpa pergeseran tetangga. */}
              <div className="relative transition-[width,margin] duration-500 ease-out-expo" style={{ width: isActive ? '140%' : '100%', marginLeft: isActive ? '-20%' : '0' }}>
                {idx < all.length - 1 && <Connector />}
                <ActivityPlate
                  href={item.href}
                  name={item.name}
                  date={item.date}
                  cover={item.cover}
                  tabIndex={clone ? -1 : undefined}
                  aria-current={isActive ? 'true' : undefined}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mx-auto mt-4 flex max-w-[1200px] items-center justify-between gap-4 px-4 md:px-8">
        <button type="button" onClick={() => center(active - 1, true)} disabled={!loop && active === 0} className={control}>
          <ChevronsLeft size={32} strokeWidth={3} aria-hidden /> {t('swipe')}
        </button>
        <div className="flex items-center gap-2.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => center(active - shown + i, true)}
              aria-label={item.name}
              aria-current={i === shown}
              className={`rounded-full transition-all duration-300 ${i === shown ? 'size-3.5 bg-brand-orange' : 'size-2 bg-brand-light-gray hover:bg-brand-dark-gray'}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => center(active + 1, true)} disabled={!loop && active === n - 1} className={control}>
          {t('swipe')} <ChevronsRight size={32} strokeWidth={3} aria-hidden />
        </button>
      </div>
    </div>
  );
}
