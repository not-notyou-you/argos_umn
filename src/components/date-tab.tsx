'use client';

import { type CSSProperties, useLayoutEffect, useRef } from 'react';

/**
 * Tab tanggal. Lebar dari server hanya perkiraan; setelah dimuat, lebar teks diukur dan --tab
 * pada kartu (`[data-tab-host]`) diganti, sehingga jarak kanan teks persis sama dengan sisi lainnya.
 * `extra` = lebar tab di luar teks: padding kiri, padding kanan, dan selisih sisi miring.
 */
export function DateTab({ day, extra, className, style }: { day: string; extra: number; className: string; style: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const host = el?.closest<HTMLElement>('[data-tab-host]');
    if (!el || !host) return;
    const measure = () => {
      // Kartu punya dua tab (desktop dan mobile); yang tersembunyi lebarnya nol dan tidak boleh ikut menentukan.
      const range = document.createRange();
      range.selectNodeContents(el);
      const width = range.getBoundingClientRect().width;
      if (width > 0) host.style.setProperty('--tab', `${width + extra}px`);
    };
    measure();
    // Ukur ulang setelah font web selesai dimuat dan saat tab ini mulai tampil (ganti ukuran layar).
    document.fonts?.ready.then(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [day, extra]);

  return (
    <span className={className} style={style}>
      <span ref={ref}>{day}</span>
    </span>
  );
}
