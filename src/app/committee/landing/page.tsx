/* eslint-disable @next/next/no-img-element */
import { getTranslations } from 'next-intl/server';
import { deleteSlide, moveSlide, updateAbout, updateSlide } from '@/actions/landing';
import { ActionButton, ActionForm, ImageUpload } from '@/components/forms';
import { Card, Field, PageHeader } from '@/components/ui';
import { requireCommittee } from '@/lib/auth';
import { imageUrl } from '@/lib/media-url';
import { getAbout, getCarousel } from '@/lib/queries';

export const metadata = { title: 'Landing Page' };

export default async function LandingEditor() {
  await requireCommittee();
  const t = await getTranslations('committee');
  const c = await getTranslations('common');
  const [about, slides] = await Promise.all([getAbout(), getCarousel({ activeOnly: false })]);
  const ids = slides.map((s) => s.slide.id);

  const swapped = (i: number, j: number) => {
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('landing')} />
      <Card className="bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h2 className="text-[22px] leading-[30px] font-semibold">{t('carousel')}</h2>
          <ImageUpload purpose="carousel" label={t('addSlide')} />
        </div>
        {slides.length === 0 && <p>{t('noSlides')}</p>}
        <ul className="flex flex-col gap-4">
          {slides.map(({ slide, storageKey }, i) => (
            <li key={slide.id} className="grid gap-3 border-t border-line pt-4 md:grid-cols-[220px_1fr]">
              <img src={imageUrl(storageKey!, 480)} alt="" className="aspect-[21/9] w-full rounded-sm object-cover" />
              <div className="flex flex-col gap-2">
                <ActionForm action={updateSlide.bind(null, slide.id)} submitLabel={c('save')} variant="secondary" className="flex flex-col gap-2">
                  <Field label={`${t('caption')} / alt text`} htmlFor={`caption-${slide.id}`}><input id={`caption-${slide.id}`} name="caption" defaultValue={slide.caption} maxLength={200} className="input" /></Field>
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={slide.isActive} className="size-5" /> {t('active')}</label>
                </ActionForm>
                <div className="flex flex-wrap gap-2">
                  {i > 0 && <ActionButton action={moveSlide.bind(null, swapped(i, i - 1))} label={c('up')} />}
                  {i < slides.length - 1 && <ActionButton action={moveSlide.bind(null, swapped(i, i + 1))} label={c('down')} />}
                  <ActionButton action={deleteSlide.bind(null, slide.id)} label={c('delete')} variant="danger" confirmText={`${c('delete')}?`} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="bg-surface">
        <h2 className="pb-4 text-[22px] leading-[30px] font-semibold">{t('aboutText')}</h2>
        <ActionForm action={updateAbout} submitLabel={c('save')}>
          <Field label={t('heroTitle')} htmlFor="heroTitle"><input id="heroTitle" name="heroTitle" required maxLength={120} defaultValue={about.heroTitle} className="input" /></Field>
          <Field label={t('heroSubtitle')} htmlFor="heroSubtitle"><textarea id="heroSubtitle" name="heroSubtitle" rows={2} maxLength={300} defaultValue={about.heroSubtitle} className="input" /></Field>
          <Field label={t('aboutTitle')} htmlFor="aboutTitle"><input id="aboutTitle" name="aboutTitle" required maxLength={120} defaultValue={about.aboutTitle} className="input" /></Field>
          <Field label={t('aboutBody')} htmlFor="aboutBody"><textarea id="aboutBody" name="aboutBody" rows={7} maxLength={5000} defaultValue={about.aboutBody} className="input" /></Field>
          <Field label={t('tiofTitle')} htmlFor="tiofTitle"><input id="tiofTitle" name="tiofTitle" required maxLength={120} defaultValue={about.tiofTitle} className="input" /></Field>
          <Field label={t('tiofBody')} htmlFor="tiofBody"><textarea id="tiofBody" name="tiofBody" rows={5} maxLength={5000} defaultValue={about.tiofBody} className="input" /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}
