import { getLocale, getTranslations } from 'next-intl/server';
import { ErrorScreen } from '@/components/error-screen';
import { ButtonLink } from '@/components/ui';

export default async function NotFound() {
  const t = await getTranslations('errors');
  const locale = await getLocale();
  const prefix = locale === 'id' ? '' : `/${locale}`;
  return (
    <ErrorScreen code="404" full title={t('notFoundTitle')} body={t('notFoundBody')}>
      <ButtonLink href={prefix || '/'} variant="accent">{t('home')}</ButtonLink>
      <ButtonLink href={`${prefix}/projects`} variant="ghost">{t('seeProjects')}</ButtonLink>
    </ErrorScreen>
  );
}
