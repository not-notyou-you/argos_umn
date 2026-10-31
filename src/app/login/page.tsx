/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { loginAction } from '@/actions/auth';
import { ProgressiveForm } from '@/components/forms';
import { Helmet } from '@/components/helmet';
import { ArgosLogo, Field } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Login' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? '/account/password' : user.memberId ? '/me/profile' : '/committee');
  const t = await getTranslations('auth');
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <div className="on-dark slash-bg relative isolate hidden items-end overflow-hidden bg-ink p-12 text-white lg:flex">
        <Helmet animated className="absolute top-1/2 left-1/2 -z-10 w-[62%] -translate-x-1/2 -translate-y-1/2 text-white/90" />
        <p className="text-sm font-semibold">#WeAreArgonauts</p>
      </div>
      <div className="flex items-center justify-center bg-surface p-6">
        <div className="w-full max-w-sm">
          <Link href="/"><ArgosLogo width={84} className="h-auto" /></Link>
          <h1 className="mt-6 text-[32px] leading-10 font-extrabold">{t('title')}</h1>
          <div className="mt-8">
            <ProgressiveForm action={loginAction} submitLabel={t('submit')}>
              <Field label={t('username')} htmlFor="username"><input id="username" name="username" required autoComplete="username" className="input" /></Field>
              <Field label={t('password')} htmlFor="password"><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></Field>
            </ProgressiveForm>
          </div>
          <p className="mt-4 text-sm leading-[22px]">{t('forgot')}</p>
        </div>
      </div>
    </main>
  );
}
