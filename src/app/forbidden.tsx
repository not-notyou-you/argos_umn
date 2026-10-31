import { getTranslations } from 'next-intl/server';
import { ErrorScreen } from '@/components/error-screen';
import { ButtonLink } from '@/components/ui';

export default async function Forbidden() {
  const t = await getTranslations('errors');
  return (
    <ErrorScreen code="403" full title={t('forbiddenTitle')} body={t('forbiddenBody')} blocked>
      <ButtonLink href="/" variant="accent">{t('home')}</ButtonLink>
    </ErrorScreen>
  );
}
