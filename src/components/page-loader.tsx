import { useTranslations } from 'next-intl';
import { Helmet } from './helmet';

export function PageLoader() {
  const t = useTranslations('nav');
  return (
    <div role="status" aria-label={t('loading')} className="flex min-h-[60vh] items-center justify-center text-brand-light-gray">
      <Helmet idle className="size-24" />
    </div>
  );
}
