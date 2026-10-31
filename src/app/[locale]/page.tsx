import { useLocale } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Carousel } from '@/components/carousel';
import { ContentCard, StatusBadge } from '@/components/display';
import { ButtonLink, Container, SectionLabel, buttonClass } from '@/components/ui';
import { getAbout, getCarousel, listActivities, listProjects } from '@/lib/queries';
import { formatDate } from '@/lib/util';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const MAIN_FOCUS = ['hpc', 'ai', 'virtualization', 'cybersecurity', 'networking'] as const;
const UMN_FOCUS = ['bigData', 'erp'] as const;

function Chips({ items, accent = false }: { items: string[]; accent?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className={`rounded-sm px-3 py-1.5 font-semibold ${accent ? 'bg-brand-orange text-ink' : 'border border-teal-text bg-white text-teal-text'}`}>{item}</li>
      ))}
    </ul>
  );
}

function LatestHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-6">
      <h2 className="text-2xl leading-8 font-bold md:text-[30px] md:leading-[38px]">{title}</h2>
      <Link href={href} className="font-semibold text-teal-text underline-offset-4 hover:underline">{label} →</Link>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('home');
  const focus = await getTranslations('focus');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  const [about, slides, projects, activities] = await Promise.all([
    getAbout(),
    getCarousel(),
    listProjects({ limit: 3 }),
    listActivities({ limit: 3 }),
  ]);

  return (
    <>
      <Carousel slides={slides.map((s) => ({ id: s.slide.id, storageKey: s.storageKey!, alt: s.altText ?? s.slide.caption }))}>
        <Container className="pt-24 pb-20 md:pb-24">
          <h1 className="max-w-[18ch] text-4xl leading-[44px] font-bold text-white md:text-[56px] md:leading-[64px]">{about.heroTitle}</h1>
          <p className="mt-4 max-w-[60ch] text-[#e6e8ea]">{about.heroSubtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href={`${prefix}/projects`} variant="accent">{t('viewProjects')}</ButtonLink>
            <a href="https://join.theiofoundation.org" target="_blank" rel="noreferrer" className={buttonClass('ghost')}>{t('join')}</a>
          </div>
        </Container>
      </Carousel>

      <section className="py-16">
        <Container className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <SectionLabel>{t('about')}</SectionLabel>
            <h2 className="mt-2 text-2xl leading-8 font-bold md:text-[30px] md:leading-[38px]">{about.aboutTitle}</h2>
            <p className="prose-text mt-4">{about.aboutBody}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/argos-logo.png" alt="Argos Clubs" width={220} className="mx-auto h-auto" />
        </Container>
      </section>

      <section className="bg-surface-muted py-16">
        <Container>
          <SectionLabel>{t('focus')}</SectionLabel>
          <div className="mt-6 grid gap-8 md:grid-cols-[2fr_1fr]">
            <div>
              <h3 className="pb-3 text-xl leading-7 font-semibold">{t('mainFocus')}</h3>
              <Chips items={MAIN_FOCUS.map((k) => focus(k))} />
            </div>
            <div>
              <h3 className="pb-3 text-xl leading-7 font-semibold">{t('umnFocus')}</h3>
              <Chips items={UMN_FOCUS.map((k) => focus(k))} accent />
            </div>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/umn-logo.webp" alt="Universitas Multimedia Nusantara" width={120} className="mx-auto h-auto rounded-md md:mx-0" />
          <div>
            <SectionLabel>{t('tiof')}</SectionLabel>
            <h2 className="mt-2 text-2xl leading-8 font-bold md:text-[30px] md:leading-[38px]">{about.tiofTitle}</h2>
            <p className="prose-text mt-4">{about.tiofBody}</p>
          </div>
        </Container>
      </section>

      {projects.length > 0 && (
        <section className="bg-surface-muted py-16">
          <Container>
            <LatestHeader title={t('latestProjects')} href={`${prefix}/projects`} label={t('seeAll')} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map(({ project, coverKey, logoKey }) => (
                <ContentCard key={project.id} href={`${prefix}/projects/${project.slug}`} name={project.name} description={project.description} coverKey={coverKey} logoKey={logoKey} meta={<StatusBadge status={project.status} />} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {activities.length > 0 && (
        <section className="py-16">
          <Container>
            <LatestHeader title={t('latestActivities')} href={`${prefix}/activities`} label={t('seeAll')} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map(({ activity, coverKey, logoKey }) => (
                <ActivityCard key={activity.id} activity={activity} coverKey={coverKey} logoKey={logoKey} prefix={prefix} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="on-dark bg-teal-text py-12 text-white">
        <Container className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl leading-8 font-bold text-white">{t('joinTitle')}</h2>
            <p className="mt-1">{t('joinBody')}</p>
          </div>
          <a href="https://join.theiofoundation.org" target="_blank" rel="noreferrer" className={buttonClass('accent')}>{t('joinCta')} ↗</a>
        </Container>
      </section>
    </>
  );
}

function ActivityCard({ activity, coverKey, logoKey, prefix }: { activity: { slug: string; name: string; description: string; activityDate: string }; coverKey: string | null; logoKey: string | null; prefix: string }) {
  const locale = useLocale();
  return (
    <ContentCard href={`${prefix}/activities/${activity.slug}`} name={activity.name} description={activity.description} coverKey={coverKey} logoKey={logoKey} meta={<p className="text-sm">{formatDate(activity.activityDate, locale)}</p>} />
  );
}
