import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container, EmptyState } from '@/components/ui';

export default async function Forbidden() {
  const t = await getTranslations('errors');
  return (
    <Container className="py-20">
      <EmptyState message={t('forbiddenTitle')} action={<ButtonLink href="/">{t('home')}</ButtonLink>} />
    </Container>
  );
}
