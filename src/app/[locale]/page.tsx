/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { Carousel } from '@/components/carousel';
import { ContentCard, Cover, StatusBadge } from '@/components/display';
import { Helmet } from '@/components/helmet';
import { ButtonLink, Container, SectionLabel, buttonClass } from '@/components/ui';
import { getAbout, getCarousel, homeStats, listActivities, listProjects } from '@/lib/queries';
import { excerpt, formatDate } from '@/lib/util';

export const dynamic = 'force-dynamic';

const FOCUS = ['hpc', 'ai', 'virtualization', 'cybersecurity', 'networking', 'bigData', 'erp'] as const;
const JOIN_URL = 'https://join.theiofoundation.org';

function LatestHeader({ label, title, href, action }: { label: string; title: string; href: string; action: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-10">
      <div>
        <SectionLabel>{label}</SectionLabel>
        <h2 className="heading-xl mt-3">{title}</h2>
      </div>
      <Link href={href} className="group inline-flex items-center gap-2 font-semibold text-teal-text">
        {action} <ArrowUpRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
  const [about, slides, projects, activities, stats] = await Promise.all([
    getAbout(),
    getCarousel(),
    listProjects({ limit: 4 }),
    listActivities({ limit: 8 }),
    homeStats(),
  ]);
  const [lead, ...others] = projects;
  const mosaic = activities.filter((a) => a.coverKey).slice(0, 3);
  const words = [t('wordLearn'), t('wordBuild'), t('wordShare'), t('wordLead'), '#WeAreArgonauts'];
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
          <p className="rise flex items-center gap-3 text-sm font-semibold text-brand-light-blue"><span className="slash" aria-hidden /> {t('eyebrow')}</p>
          <h1 className="rise hero-title mt-5 max-w-[12ch] text-white" style={{ animationDelay: '120ms' }}>{about.heroTitle}</h1>
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

      <div aria-hidden className="overflow-hidden bg-brand-orange py-3 text-ink">
        <div className="marquee-track flex w-max">
          {[0, 1].map((n) => (
            <div key={n} className="flex shrink-0">
              {[...words, ...words, ...words].map((word, i) => (
                <span key={i} className="flex items-center gap-6 pr-6 text-lg font-extrabold tracking-tight uppercase">{word} <span className="slash bg-ink!" /></span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="py-20 md:py-32">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="reveal">
            <SectionLabel>{t('about')}</SectionLabel>
            <h2 className="statement mt-4">{about.aboutTitle}</h2>
            <p className="prose-text mt-6 text-lg leading-8">{about.aboutBody}</p>
          </div>
          {mosaic.length === 3 ? (
            <div className="reveal grid grid-cols-5 grid-rows-5 gap-3 aspect-[5/5]">
              <Cover storageKey={mosaic[0].coverKey} alt="" sizes="360px" className="col-span-3 row-span-3 size-full rounded-md" />
              <Cover storageKey={mosaic[1].coverKey} alt="" sizes="240px" className="col-span-2 row-span-2 size-full rounded-md" />
              <div className="col-span-2 row-span-3 flex items-end justify-center rounded-md bg-ink p-4 text-white"><Helmet className="w-full" /></div>
              <Cover storageKey={mosaic[2].coverKey} alt="" sizes="360px" className="col-span-3 row-span-2 size-full rounded-md" />
            </div>
          ) : (
            <img src="/brand/argos-logo.png" alt="Argos Clubs" width={260} className="mx-auto h-auto" />
          )}
        </Container>
      </section>

      <section className="on-dark cut-top relative bg-ink pt-28 pb-20 text-white md:pb-28">
        <Container>
          <div className="grid gap-4 pb-10 md:grid-cols-2 md:items-end">
            <div>
              <p className="label text-brand-orange">{t('focus')}</p>
              <h2 className="heading-xl mt-3 text-white">{t('mainFocus')}</h2>
            </div>
            <p className="max-w-[46ch] text-lg leading-8 text-[#c9cdd2] md:justify-self-end">{t('focusIntro')}</p>
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

      {lead && (
        <section className="py-20 md:py-32">
          <Container>
            <LatestHeader label={t('featured')} title={t('latestProjects')} href={`${prefix}/projects`} action={t('seeAll')} />
            <article className="reveal group on-dark relative mb-6 overflow-hidden rounded-md bg-ink">
              <Cover storageKey={lead.coverKey} alt="" sizes="(min-width: 1200px) 1136px, 100vw" className="zoom-img aspect-[4/3] w-full opacity-80 md:aspect-[21/9]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-5 md:p-10">
                <div className="max-w-2xl">
                  <StatusBadge status={lead.project.status} />
                  <h3 className="heading-xl mt-3 text-white">
                    <Link href={`${prefix}/projects/${lead.project.slug}`} className="after:absolute after:inset-0">{lead.project.name}</Link>
                  </h3>
                  <p className="mt-2 hidden text-[#d8dbdf] md:block">{excerpt(lead.project.description, 150)}</p>
                </div>
                <span className={`${buttonClass('accent')} hidden md:inline-flex`} aria-hidden>{p('view')} <ArrowUpRight size={18} /></span>
              </div>
            </article>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map(({ project, coverKey, logoKey }) => (
                <ContentCard key={project.id} href={`${prefix}/projects/${project.slug}`} name={project.name} description={project.description} coverKey={coverKey} logoKey={logoKey} meta={<StatusBadge status={project.status} />} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {activities.length > 0 && (
        <section className="overflow-hidden bg-surface-muted py-20 md:py-28">
          <Container>
            <LatestHeader label={t('latestActivities')} title={t('latestActivities')} href={`${prefix}/activities`} action={t('seeAll')} />
          </Container>
          <ul tabIndex={0} aria-label={t('scroll')} className="flex snap-x gap-5 overflow-x-auto px-4 pb-4 md:px-8 lg:pl-[max(2rem,calc((100vw-1200px)/2+2rem))]">
            {activities.map(({ activity, coverKey, logoKey }) => (
              <li key={activity.id} className="w-[78vw] max-w-[340px] shrink-0 snap-start">
                <ContentCard href={`${prefix}/activities/${activity.slug}`} name={activity.name} description={activity.description} coverKey={coverKey} logoKey={logoKey} meta={<p className="text-sm font-semibold text-teal-text">{formatDate(activity.activityDate, locale)}</p>} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="py-20 md:py-28">
        <Container className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-6">
            <img src="/brand/argos-logo.png" alt="Argos Clubs" width={120} className="h-auto" />
            <img src="/brand/umn-logo.webp" alt="Universitas Multimedia Nusantara" width={104} className="h-auto" />
          </div>
          <div className="reveal md:border-l md:border-line md:pl-10">
            <SectionLabel>{t('tiof')}</SectionLabel>
            <h2 className="mt-3 text-[clamp(1.5rem,2.6vw,2.25rem)] leading-tight font-bold">{about.tiofTitle}</h2>
            <p className="prose-text mt-3">{about.tiofBody}</p>
          </div>
        </Container>
      </section>

      <section className="relative isolate overflow-hidden bg-brand-orange py-20 text-ink md:py-28">
        <Helmet className="absolute top-1/2 -right-[6%] -z-10 w-[46%] -translate-y-1/2 text-ink/[0.08]" />
        <Container>
          <h2 className="display max-w-[14ch]">{t('joinTitle')}</h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-8 font-semibold">{t('joinBody')}</p>
          <a href={JOIN_URL} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-sm bg-ink px-6 font-semibold text-white transition-colors hover:bg-ink-soft">
            {t('joinCta')} <ArrowUpRight size={18} aria-hidden />
          </a>
        </Container>
      </section>
    </>
  );
}
