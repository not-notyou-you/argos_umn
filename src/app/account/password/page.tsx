import { getTranslations } from 'next-intl/server';
import { changePasswordAction } from '@/actions/auth';
import { ProgressiveForm } from '@/components/forms';
import { Field, Notice } from '@/components/ui';
import { requireAccount } from '@/lib/auth';

export const metadata = { title: 'Password' };

export default async function PasswordPage() {
  const user = await requireAccount({ allowTemporaryPassword: true });
  const t = await getTranslations('auth');
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted p-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-line bg-surface p-6">
        <div>
          <h1 className="text-xl leading-7 font-semibold">{t('changeTitle')}</h1>
          <p>{t('changeIntro')}</p>
        </div>
        {user.mustChangePassword && <Notice>{t('mustChange')}</Notice>}
        <ProgressiveForm action={changePasswordAction} submitLabel={t('save')}>
          <Field label={t('current')} htmlFor="current"><input id="current" name="current" type="password" required autoComplete="current-password" className="input" /></Field>
          <Field label={t('new')} htmlFor="new"><input id="new" name="new" type="password" required minLength={12} autoComplete="new-password" className="input" /></Field>
          <Field label={t('confirm')} htmlFor="confirm"><input id="confirm" name="confirm" type="password" required minLength={12} autoComplete="new-password" className="input" /></Field>
        </ProgressiveForm>
      </div>
    </main>
  );
}
