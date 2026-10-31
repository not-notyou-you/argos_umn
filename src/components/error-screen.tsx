import type { ReactNode } from 'react';
import { Helmet } from './helmet';
import { Container } from './ui';

/** Halaman galat layar penuh. Helmet menggantikan angka 0 pada kode status. */
export function ErrorScreen({ code, title, body, blocked = false, full = false, children }: { code: '404' | '403'; title: string; body: string; blocked?: boolean; full?: boolean; children: ReactNode }) {
  return (
    <section className={`on-dark slash-bg grain relative isolate flex items-center ${full ? 'min-h-svh' : 'min-h-[calc(100svh-72px)]'} overflow-hidden bg-ink py-16 text-white`}>
      <Container className="flex flex-col items-center text-center">
        <p aria-label={code} className="error-code rise flex items-center">
          <span aria-hidden>{code[0]}</span>
          <span aria-hidden className={`helmet-float relative mx-[0.04em] block w-[0.82em] ${blocked ? 'text-white' : 'text-brand-orange'}`}>
            <Helmet animated className="block w-full" />
            {blocked && <span className="absolute top-1/2 -left-[8%] h-[0.09em] w-[116%] -translate-y-1/2 -rotate-[32deg] bg-brand-orange" />}
          </span>
          <span aria-hidden>{code[2]}</span>
        </p>
        <h1 className="rise heading-xl mt-6 max-w-[20ch] text-white" style={{ animationDelay: '150ms' }}>{title}</h1>
        <p className="rise mt-4 max-w-[46ch] text-lg leading-8 text-[#d3d6da]" style={{ animationDelay: '280ms' }}>{body}</p>
        <div className="rise mt-8 flex flex-wrap justify-center gap-3" style={{ animationDelay: '410ms' }}>{children}</div>
      </Container>
    </section>
  );
}
