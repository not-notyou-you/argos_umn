import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-4 py-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

const variants = {
  primary: 'bg-teal-solid text-white hover:bg-teal-solid-hover',
  accent: 'bg-brand-orange text-ink hover:bg-[#f9a56d]',
  secondary: 'border border-teal-text text-teal-text hover:bg-surface-muted',
  ghost: 'border border-white/50 text-white hover:bg-white hover:text-ink',
  danger: 'bg-danger-solid text-white hover:bg-danger-solid-hover',
};

export type ButtonVariant = keyof typeof variants;

export const buttonClass = (variant: ButtonVariant = 'primary') => `${buttonBase} ${variants[variant]}`;

export function Button({ variant, className = '', ...props }: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return <button {...props} className={`${buttonClass(variant)} ${className}`} />;
}

export function ButtonLink({ variant, className = '', ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link {...props} className={`${buttonClass(variant)} ${className}`} />;
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 md:px-8 ${className}`}>{children}</div>;
}

export function PageHeader({ title, intro, action }: { title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
      <div>
        <h1 className="text-[30px] leading-[38px] font-bold md:text-[40px] md:leading-[48px]">{title}</h1>
        {intro && <p className="mt-2 max-w-[60ch]">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHero({ title, intro }: { title: string; intro?: string }) {
  return (
    <section className="on-dark slash-move bg-ink pt-16 pb-14 md:pt-24 md:pb-20">
      <Container>
        <h1 className="rise display text-white">{title}</h1>
        {intro && <p className="rise mt-4 max-w-[52ch] text-lg leading-8 text-[#d3d6da]" style={{ animationDelay: '120ms' }}>{intro}</p>}
      </Container>
    </section>
  );
}

export function ArgosLogo({ width, className = '' }: { width: number; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/argos-logo.png" alt="Argos Clubs" width={width} className={`theme-light-only ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/argos-logo-white.png" alt="Argos Clubs" width={width} className={`theme-dark-only ${className}`} />
    </>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-dashed border-brand-light-gray p-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/argos-helmet.png" alt="" width={48} height={48} className="theme-light-only opacity-60" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/argos-helmet-white.png" alt="" width={48} height={48} className="theme-dark-only opacity-60" />
      <p>{message}</p>
      {action}
    </div>
  );
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="font-semibold text-heading">{label}</label>
      {children}
      {hint && <p className="text-sm leading-[22px]">{hint}</p>}
      {error && <p className="text-sm leading-[22px] text-danger">{error}</p>}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: ReactNode }) {
  const tones = {
    info: 'border-brand-dark-blue bg-surface-muted text-heading',
    error: 'border-danger bg-danger-soft text-danger',
    success: 'border-teal-text bg-surface-muted text-teal-text',
  };
  return <p role="status" aria-live="polite" className={`rounded-sm border-l-4 p-3 ${tones[tone]}`}>{children}</p>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-md border border-line p-4 shadow-[0_1px_2px_rgb(28_31_36/0.04)] md:p-6 ${className}`}>{children}</section>;
}
