/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ActivityChain } from '@/components/activity-chain';
import { Carousel } from '@/components/carousel';
import { ContentCard, Cover, StatusBadge } from '@/components/display';
import { Helmet } from '@/components/helmet';
import { InterlockGallery } from '@/components/interlock-gallery';
import { ProjectFrame } from '@/components/project-frame';
import { ArgosLogo, ButtonLink, Container, buttonClass } from '@/components/ui';
import { galleryItems, getAbout, getCarousel, homeStats, listActivities, listProjects } from '@/lib/queries';
import { JOIN_URL, excerpt } from '@/lib/util';

export const dynamic = 'force-dynamic';

const FOCUS = ['hpc', 'ai', 'virtualization', 'cybersecurity', 'networking', 'bigData', 'erp'] as const;
/** YYYY-MM-DD → DD/MM/YY, sesuai desain kartu aktivitas. */
const shortDate = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y.slice(2)}`; };

/**
 * Tombol panah setinggi 52px. Ujungnya selebar setengah tinggi (26px), jadi kemiringannya 45°,
 * sama dengan chevron. Chevron berjarak sama dan yang terakhir sejajar dengan ujung panah.
 */
const SEE_ALL_ARROW = 'polygon(0 0, calc(100% - 26px) 0, 100% 50%, calc(100% - 26px) 100%, 0 100%)';
/**
 * Lima chevron setinggi penuh (45°, menembus tepi atas-bawah). Celah antar-chevron dan celah ke
 * ujung panah sama dengan tebal garis, diukur tegak lurus. Pada garis 45°, jarak tegak lurus d
 * sama dengan d × √2 secara mendatar. Ukuran tombol tidak berubah. Saat hover satu chevron padam
 * bergiliran dari kiri ke kanan: >>>>> → _>>>> → >_>>> → … → >>>>_ → >>>>> (lihat chevron-blink di globals.css).
 */
const STROKE = 6;
const STEP = 2 * STROKE * Math.SQRT2;
const LEAD = 8;
const CHEVRON_W = 30;
const CHEVRON_COUNT = 5;
// Setengah tebal garis chevron terakhir ditambah satu celah, lalu ujung panah.
const CHEVRONS_W = LEAD + (CHEVRON_COUNT - 1) * STEP + CHEVRON_W + 1.5 * STROKE * Math.SQRT2;
const CHEVRONS = Array.from({ length: CHEVRON_COUNT }, (_, i) => LEAD + i * STEP);
/** Lama satu langkah animasi; satu putaran = (CHEVRON_COUNT + 1) langkah. */
const BLINK_STEP_MS = 120;

function LatestHeader({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="reveal flex flex-wrap items-end justify-between gap-4 pb-10">
      <div>
        <h2 className="heading-xl">{title}</h2>
      </div>
      {/* Tombol panah; saat hover chevron padam bergiliran tanpa mengubah ukuran tombol. */}
      <Link
        href={href}
        className="see-all group inline-flex h-[52px] items-center gap-5 pl-7 text-lg font-extrabold tracking-[0.1em] uppercase"
        style={{ clipPath: SEE_ALL_ARROW }}
      >
        {action}
        <span aria-hidden className="block h-full overflow-hidden" style={{ width: CHEVRONS_W }}>
          <svg viewBox={`0 0 ${CHEVRONS_W} 52`} style={{ width: CHEVRONS_W }} className="h-full" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="butt">
            {CHEVRONS.map((x, i) => (
              <polyline
                key={x}
                points={`${x},-4 ${x + CHEVRON_W},26 ${x},56`}
                className="see-all-chevron"
                style={{ animationDuration: `${(CHEVRON_COUNT + 1) * BLINK_STEP_MS}ms`, animationDelay: `${i * BLINK_STEP_MS}ms` }}
              />
            ))}
          </svg>
        </span>
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('home');
  const p = await getTranslations('project');
  const focus = await getTranslations('focus');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const [about, slides, projects, activities, stats, gallery] = await Promise.all([
    getAbout(),
    getCarousel(),
    listProjects({ limit: 4 }),
    listActivities({ limit: 8 }),
    homeStats(),
    galleryItems('all', 40),
  ]);
  // Kumpulan foto untuk galeri About: foto galeri ditambah sampul activity, diacak tiap request.
  const aboutPhotos = [...new Set([
    ...gallery.items.filter((g) => g.media.kind === 'image' && g.media.storageKey).map((g) => g.media.storageKey!),
    ...activities.map((a) => a.coverKey).filter((k): k is string => !!k),
  ])].sort(() => Math.random() - 0.5);
  const statItems = [
    { value: stats.projects, label: t('statProjects') },
    { value: stats.activities, label: t('statActivities') },
    { value: stats.members, label: t('statMembers') },
    { value: stats.media, label: t('statPhotos') },
  ];

  return (
    <>
      <Carousel
        slides={slides.map((s) => ({ id: s.slide.id, storageKey: s.storageKey!, alt: s.altText ?? s.slide.caption }))}
        fallback={<div className="slash-bg absolute inset-0 flex items-center justify-center text-white"><Helmet animated className="w-1/2" /></div>}
      >
        <div className="w-full px-4 py-12 md:px-8 lg:py-10 lg:pr-0 lg:pl-[max(2rem,calc((100vw-1200px)/2+2rem))]">
          <Helmet animated className="absolute -bottom-[12%] -left-[10%] -z-10 w-[58%] text-white/[0.035]" />
          <h1 className="rise hero-title max-w-[12ch] text-white" style={{ animationDelay: '120ms' }}>{about.heroTitle}</h1>
          <p className="rise mt-6 max-w-[46ch] text-lg leading-8 text-[#d3d6da]" style={{ animationDelay: '240ms' }}>{about.heroSubtitle}</p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '360ms' }}>
            <ButtonLink href={`${prefix}/projects`} variant="accent">{t('viewProjects')}</ButtonLink>
            <a href={JOIN_URL} target="_blank" rel="noreferrer" className={buttonClass('ghost')}>{t('join')}</a>
          </div>
          <dl className="rise mt-9 grid max-w-xl grid-cols-4 gap-4 border-t border-white/15 pt-5" style={{ animationDelay: '480ms' }}>
            {statItems.map((item) => (
              <div key={item.label}>
                <dd className="text-3xl leading-9 font-extrabold text-white md:text-4xl md:leading-10">{item.value}</dd>
                <dt className="text-xs leading-5 text-[#b6bbc1]">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </Carousel>

      <div aria-hidden className="overflow-hidden bg-brand-orange py-4">
        <div className="marquee-track flex w-max">
          {Array.from({ length: 80 }, (_, i) => <span key={i} className="slash mr-6 shrink-0 bg-ink!" />)}
        </div>
      </div>

      <section className="py-20 md:py-32">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="reveal-left">
            <h2 className="statement">{about.aboutTitle}</h2>
            <p className="prose-text mt-6 text-lg leading-8">{about.aboutBody}</p>
          </div>
          {aboutPhotos.length > 0 ? (
            <InterlockGallery keys={aboutPhotos} className="reveal-right mx-auto w-full max-w-[460px]" />
          ) : (
            <ArgosLogo width={260} className="mx-auto h-auto" />
          )}
        </Container>
      </section>

      <section className="on-dark cut-top relative bg-ink pt-28 pb-20 text-white md:pb-28">
        <Container>
          <div className="reveal pb-10">
            <h2 className="heading-xl text-white">{t('mainFocus')}</h2>
          </div>
          <ul>
            {FOCUS.map((key, i) => (
              <li key={key} className="reveal focus-row flex items-baseline gap-5 border-t border-white/15 py-4 md:py-5">
                <span aria-hidden className="w-8 text-sm text-[#a9aeb5]">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[clamp(1.5rem,4.2vw,3.5rem)] leading-tight font-bold tracking-tight">{focus(key)}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {projects.length > 0 && (
        <section className="py-20 md:py-32">
          <Container>
            <LatestHeader title={t('latestProjects')} href={`${prefix}/projects`} action={t('seeAll')} />
            <div className="reveal-items grid gap-8 sm:grid-cols-2">
              {projects.map(({ project, coverKey }) => (
                <ProjectFrame key={project.id} href={`${prefix}/projects/${project.slug}`} name={project.name} description={project.description} coverKey={coverKey} status={project.status} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {activities.length > 0 && (
        <section className="overflow-clip bg-surface-muted py-20 md:py-28">
          <Container>
            <LatestHeader title={t('latestActivities')} href={`${prefix}/activities`} action={t('seeAll')} />
          </Container>
          <ActivityChain
            label={t('scroll')}
            items={activities.map(({ activity, coverKey }) => ({
              id: activity.id,
              href: `${prefix}/activities/${activity.slug}`,
              name: activity.name,
              date: shortDate(activity.activityDate),
              cover: <Cover storageKey={coverKey} alt="" sizes="300px" kind="activity" title={activity.name} />,
            }))}
          />
        </section>
      )}

      <section className="relative isolate overflow-clip bg-brand-orange py-20 text-ink md:py-28">
        <Helmet className="spin-scroll absolute top-1/2 -right-[6%] -z-10 w-[46%] -translate-y-1/2 text-ink/[0.08]" />
        <Container>
          <h2 className="reveal display max-w-[14ch] text-ink">{t('joinTitle')}</h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-8 font-semibold">{t('joinBody')}</p>
          <a href={JOIN_URL} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-sm bg-ink px-6 font-semibold text-white transition-colors hover:bg-ink-soft">
            {t('joinCta')} <ArrowUpRight size={18} aria-hidden />
          </a>
        </Container>
      </section>
    </>
  );
}
