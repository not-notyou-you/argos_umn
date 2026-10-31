'use client';

/* eslint-disable @next/next/no-img-element */
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { imageSrcSet, imageUrl } from '@/lib/media-url';

type Slide = { id: string; storageKey: string; alt: string };

export function Carousel({ slides, children }: { slides: Slide[]; children: ReactNode }) {
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
    <section
      className="on-dark relative isolate flex min-h-[520px] items-end overflow-hidden bg-ink md:min-h-[560px]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      {slides.length === 0 && <div className="slash-bg absolute inset-0 -z-10" />}
      {slides.map((slide, i) => (
        <img
          key={slide.id}
          src={imageUrl(slide.storageKey, 1600)}
          srcSet={imageSrcSet(slide.storageKey)}
          sizes="100vw"
          alt={i === index ? slide.alt : ''}
          aria-hidden={i !== index}
          className={`absolute inset-0 -z-20 size-full object-cover transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {slides.length > 0 && <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />}
      {children}
      {slides.length > 1 && (
        <div className="absolute right-4 bottom-4 flex items-center gap-1 text-white md:right-8">
          <button aria-label={t('previous')} onClick={() => go(-1)} className="flex size-11 cursor-pointer items-center justify-center"><ChevronLeft /></button>
          {slides.map((slide, i) => (
            <button key={slide.id} aria-label={t('slide', { n: i + 1 })} aria-current={i === index} onClick={() => setIndex(i)} className="flex size-6 cursor-pointer items-center justify-center">
              <span className={`size-2.5 rounded-full border border-white ${i === index ? 'bg-brand-orange' : ''}`} />
            </button>
          ))}
          <button aria-label={t('next')} onClick={() => go(1)} className="flex size-11 cursor-pointer items-center justify-center"><ChevronRight /></button>
          <button aria-label={playing ? t('pause') : t('play')} onClick={() => setPlaying(!playing)} className="flex size-11 cursor-pointer items-center justify-center">
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      )}
    </section>
  );
}
