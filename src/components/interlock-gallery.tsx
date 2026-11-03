'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { imageUrl } from '@/lib/media-url';

/** Bidang rancangan 618×874. Empat keping saling mengunci dengan celah 22 di antaranya. */
const W = 618;
const H = 874;
const TILES = [
  [[0, 0], [224, 0], [224, 222], [298, 222], [298, 417], [142, 417], [142, 512], [0, 512]],
  [[248, 0], [520, 0], [618, 94], [618, 320], [460, 320], [460, 417], [320, 417], [320, 200], [248, 200]],
  [[0, 534], [164, 534], [164, 440], [298, 440], [298, 665], [392, 665], [392, 874], [110, 874], [0, 764]],
  [[320, 440], [482, 440], [482, 342], [618, 342], [618, 874], [414, 874], [414, 642], [320, 642]],
];

/** Tebal border keping. */
const BORDER_PX = 4;

/**
 * Arah geser tiap titik agar tiap sisi masuk sejauh 1px ke dalam (dikali BORDER_PX) (vektor miter).
 * Skala bidang seragam, jadi arah dari satuan rancangan tetap benar dalam piksel.
 */
function insetVectors(points: number[][]) {
  const n = points.length;
  const area = points.reduce((sum, [x, y], i) => sum + x * points[(i + 1) % n][1] - points[(i + 1) % n][0] * y, 0);
  const inward = (a: number[], b: number[]) => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len = Math.hypot(dx, dy);
    return area > 0 ? [-dy / len, dx / len] : [dy / len, -dx / len];
  };
  return points.map((p, i) => {
    const n1 = inward(points[(i - 1 + n) % n], p);
    const n2 = inward(p, points[(i + 1) % n]);
    const k = 1 + n1[0] * n2[0] + n1[1] * n2[1];
    return [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k];
  });
}

/** Kotak pembatas tiap keping (persen bidang), clip-path luar untuk border, dan clip-path dalam untuk foto. */
const SHAPES = TILES.map((points) => {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(3)}%`;
  const offsets = insetVectors(points);
  const at = (v: number, total: number, shift: number) => (shift ? `calc(${pct(v, total)} + ${(shift * BORDER_PX).toFixed(3)}px)` : pct(v, total));
  return {
    box: { left: pct(x0, W), top: pct(y0, H), width: pct(x1 - x0, W), height: pct(y1 - y0, H) },
    clipPath: `polygon(${points.map(([x, y]) => `${pct(x - x0, x1 - x0)} ${pct(y - y0, y1 - y0)}`).join(', ')})`,
    innerClipPath: `polygon(${points.map(([x, y], i) => `${at(x - x0, x1 - x0, offsets[i][0])} ${at(y - y0, y1 - y0, offsets[i][1])}`).join(', ')})`,
  };
});

const INTERVAL_MS = 1000;

/** Empat foto acak; setiap 1 detik satu keping acak berganti ke foto yang belum tampil. */
export function InterlockGallery({ keys, className = '' }: { keys: string[]; className?: string }) {
  // Urutan `keys` sudah diacak di server, jadi tampilan awal sama di server dan klien.
  const [slots, setSlots] = useState(() => Array.from({ length: 4 }, (_, i) => keys[i % keys.length]));
  const [previous, setPrevious] = useState<(string | null)[]>([null, null, null, null]);
  const slotsRef = useRef(slots);
  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    if (keys.length < 2) return;
    let alive = true;
    const timer = setInterval(() => {
      const current = slotsRef.current;
      const slot = Math.floor(Math.random() * 4);
      const unused = keys.filter((k) => !current.includes(k));
      // Kurang dari lima foto: pakai foto dari keping lain.
      const next = unused.length ? unused[Math.floor(Math.random() * unused.length)] : current[(slot + 1 + Math.floor(Math.random() * 3)) % 4];
      if (next === current[slot]) return;
      // Ganti setelah gambarnya termuat agar tidak berkedip kosong.
      const img = new Image();
      img.onload = img.onerror = () => {
        if (!alive) return;
        setPrevious((p) => p.map((v, i) => (i === slot ? slotsRef.current[slot] : v)));
        setSlots((s) => s.map((v, i) => (i === slot ? next : v)));
      };
      img.src = imageUrl(next, 960);
    }, INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [keys]);

  return (
    <div aria-hidden className={`relative aspect-[618/874] ${className}`}>
      {SHAPES.map((shape, i) => (
        <div key={i} className="orange-border absolute" style={{ ...shape.box, clipPath: shape.clipPath }}>
          <div className="absolute inset-0 overflow-hidden bg-ink" style={{ clipPath: shape.innerClipPath }}>
            {previous[i] && <img src={imageUrl(previous[i], 960)} alt="" className="absolute inset-0 size-full object-cover" />}
            <img key={slots[i]} src={imageUrl(slots[i], 960)} alt="" className="interlock-in absolute inset-0 size-full object-cover" />
          </div>
        </div>
      ))}
    </div>
  );
}
