/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { logoutAction } from '@/actions/auth';
import { getCurrentUser } from '@/lib/auth';
import { Helmet } from './helmet';
import { LanguageSwitch } from './language-switch';
import { MobileNav } from './mobile-nav';
import { NavLinks } from './nav-links';
import { ThemeToggle } from './theme-toggle';
import { Container, buttonClass } from './ui';

export async function getPublicNav() {
  const t = await getTranslations('nav');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  return {
    prefix,
    items: [
      { href: `${prefix}/` , label: t('home') },
      { href: `${prefix}/projects`, label: t('projects') },
      { href: `${prefix}/activities`, label: t('activities') },
      { href: `${prefix}/members`, label: t('members') },
      { href: `${prefix}/galleries`, label: t('galleries') },
    ],
  };
}

export async function Header() {
  const t = await getTranslations('nav');
  const user = await getCurrentUser();
  const { items, prefix } = await getPublicNav();
  const accountHref = user ? (user.memberId ? '/me/profile' : '/committee') : '/login';
  const accountLabel = user ? (user.memberId ? t('myProfile') : t('committee')) : t('login');

  return (
    <header className="on-dark sticky top-0 z-40 border-b border-white/10 bg-ink/90 text-white backdrop-blur-md">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:bg-white focus:p-2 focus:text-ink">{t('skip')}</a>
      <Container className="flex h-[72px] items-center justify-between gap-4">
        <Link href={prefix || '/'} className="flex items-center gap-2.5 font-bold text-white">
          <Helmet className="size-8" />
          <span>Argos Club @ UMN</span>
        </Link>
        <NavLinks items={items} label={t('menu')} />
        <div className="flex items-center gap-1 lg:gap-3">
          <ThemeToggle />
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitch dark />
            <Link href={accountHref} className={buttonClass('ghost')}>{accountLabel}</Link>
          </div>
          <MobileNav items={[...items, { href: accountHref, label: accountLabel }]} />
        </div>
      </Container>
    </header>
  );
}

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="on-dark relative isolate overflow-hidden bg-ink text-[#d8dadd]">
      <Helmet className="absolute -right-[8%] -bottom-[30%] -z-10 w-[44%] text-white/[0.04]" />
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
        <div>
          <p className="text-[clamp(1.75rem,3.4vw,2.75rem)] leading-tight font-extrabold tracking-tight text-white">Argos Club<br />@ UMN</p>
          <p className="mt-6 max-w-[38ch] text-sm leading-[22px]">{t('part')}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-5">
            <img src="/brand/argos-logo-white.png" alt="Argos Clubs" width={84} className="h-auto" />
            <img src="/brand/umn-logo.webp" alt="Universitas Multimedia Nusantara" width={72} className="h-auto" />
          </div>
        </div>
        <div>
          <p className="label text-brand-light-blue">{t('links')}</p>
          <ul className="mt-3 flex flex-col gap-2">
            <li><a className="hover:text-white" href="https://theiofoundation.org/argos-clubs" target="_blank" rel="noreferrer">{t('site')} ↗</a></li>
            <li><a className="hover:text-white" href="https://community.theiofoundation.org/argos-clubs" target="_blank" rel="noreferrer">{t('community')} ↗</a></li>
            <li><a className="hover:text-white" href="https://join.theiofoundation.org" target="_blank" rel="noreferrer">{t('join')} ↗</a></li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}

type NavItem = { href: string; label: string; badge?: number };

export async function PanelShell({ title, items, children }: { title: string; items: NavItem[]; children: React.ReactNode }) {
  const t = await getTranslations('nav');
  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-surface-muted md:grid md:grid-cols-[240px_1fr]">
      <aside className="on-dark bg-ink p-4 text-[#d8dadd] md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <img src="/brand/argos-helmet-white.png" alt="" width={30} height={29} />
          {title}
        </Link>
        <nav aria-label={title} className="mt-4 flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-11 shrink-0 items-center justify-between gap-2 rounded-sm px-3 py-2 font-semibold hover:bg-white/10">
              {item.label}
              {item.badge ? <span className="rounded-sm bg-brand-orange px-1.5 text-sm text-ink">{item.badge}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/20 pt-3">
          <span className="truncate text-sm">{user?.username}</span>
          <div className="flex items-center">
            <ThemeToggle />
            <LanguageSwitch dark />
          </div>
        </div>
        <form action={logoutAction}>
          <button className="mt-2 min-h-11 w-full cursor-pointer rounded-sm border border-white/30 px-3 hover:bg-white/10">{t('logout')}</button>
        </form>
      </aside>
      <main id="content" className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
