'use client';

/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { imageSrcSet, imageUrl } from '@/lib/media-url';

type Slide = { id: string; storageKey: string; alt: string };

/** Hero layar penuh: teks di panel gelap, foto di panel miring. */
export function Carousel({ slides, children, fallback }: { slides: Slide[]; children: ReactNode; fallback: ReactNode }) {
  const t = useTranslations('home');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!playing || hovering || slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [playing, hovering, slides.length]);

  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length);

  return (
    <section className="on-dark relative isolate grid min-h-[calc(100svh-72px)] overflow-hidden bg-ink lg:grid-cols-[1.08fr_1fr]">
      <div className="relative z-10 flex items-center">{children}</div>
      <div
        className="hero-panel panel-open relative min-h-[46svh] overflow-hidden bg-ink-soft lg:-ml-[9vw] lg:min-h-0"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocusCapture={() => setHovering(true)}
        onBlurCapture={() => setHovering(false)}
      >
        {slides.length === 0 && fallback}
        {slides.map((slide, i) => (
          <img
            key={slide.id}
            src={imageUrl(slide.storageKey, 1600)}
            srcSet={imageSrcSet(slide.storageKey)}
            sizes="(min-width: 1024px) 55vw, 100vw"
            alt={i === index ? slide.alt : ''}
            aria-hidden={i !== index}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 ${i === index ? 'ken-burns opacity-100' : 'opacity-0'}`}
          />
        ))}
        {slides.length > 0 && <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/10" />}
        {slides.length > 1 && (
          <div className="absolute right-3 bottom-3 flex items-center gap-1 text-white md:right-6 md:bottom-5">
            <button aria-label={t('previous')} onClick={() => go(-1)} className="flex size-11 cursor-pointer items-center justify-center"><ChevronLeft /></button>
            {slides.map((slide, i) => (
              <button key={slide.id} aria-label={t('slide', { n: i + 1 })} aria-current={i === index} onClick={() => setIndex(i)} className="flex h-11 w-7 cursor-pointer items-center justify-center">
                <span className={`h-1.5 w-5 -skew-x-[32deg] transition-colors ${i === index ? 'bg-brand-orange' : 'bg-white/50'}`} />
              </button>
            ))}
            <button aria-label={t('next')} onClick={() => go(1)} className="flex size-11 cursor-pointer items-center justify-center"><ChevronRight /></button>
            <button aria-label={playing ? t('pause') : t('play')} onClick={() => setPlaying(!playing)} className="flex size-11 cursor-pointer items-center justify-center">
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
