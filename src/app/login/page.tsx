/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { loginAction } from '@/actions/auth';
import { ProgressiveForm } from '@/components/forms';
import { Field } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';

export const metadata = { title: 'Login' };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? '/account/password' : user.memberId ? '/me/profile' : '/committee');
  const t = await getTranslations('auth');
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <div className="w-full max-w-sm rounded-md border border-line bg-white p-6">
        <Link href="/"><img src="/brand/argos-logo.png" alt="Argos Clubs" width={110} className="mx-auto h-auto" /></Link>
        <h1 className="mt-4 text-center text-xl leading-7 font-semibold">{t('title')}</h1>
        <div className="mt-6">
          <ProgressiveForm action={loginAction} submitLabel={t('submit')}>
            <Field label={t('username')} htmlFor="username"><input id="username" name="username" required autoComplete="username" className="input" /></Field>
            <Field label={t('password')} htmlFor="password"><input id="password" name="password" type="password" required autoComplete="current-password" className="input" /></Field>
          </ProgressiveForm>
        </div>
        <p className="mt-4 text-sm leading-[22px]">{t('forgot')}</p>
      </div>
    </main>
  );
}
