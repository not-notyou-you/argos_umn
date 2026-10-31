import { useTranslations } from 'next-intl';
import { Field } from './ui';

type Project = {
  name: string;
  description: string;
  projectUrl: string | null;
  projectUrlVisible: boolean;
  githubUrl: string | null;
  githubUrlVisible: boolean;
  docsUrl: string | null;
  docsUrlVisible: boolean;
};

export function ProjectFields({ project }: { project: Project }) {
  const t = useTranslations('project');
  const c = useTranslations('common');
  const e = useTranslations('editor');
  const buttons = [
    { key: 'projectUrl', label: t('open'), url: project.projectUrl, visible: project.projectUrlVisible },
    { key: 'githubUrl', label: t('github'), url: project.githubUrl, visible: project.githubUrlVisible },
    { key: 'docsUrl', label: t('docs'), url: project.docsUrl, visible: project.docsUrlVisible },
  ];
  return (
    <>
      <Field label={c('name')} htmlFor="name"><input id="name" name="name" required maxLength={120} defaultValue={project.name} className="input" /></Field>
      <Field label={c('description')} htmlFor="description"><textarea id="description" name="description" rows={7} maxLength={10000} defaultValue={project.description} className="input" /></Field>
      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold text-heading">{e('buttons')}</legend>
        {buttons.map((b) => (
          <div key={b.key} className="grid items-center gap-2 sm:grid-cols-[190px_120px_1fr]">
            <span>{b.label}</span>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" name={`${b.key}Visible`} defaultChecked={b.visible} className="size-5" />
              {e('visible')}
            </label>
            <input name={b.key} type="url" defaultValue={b.url ?? ''} placeholder="https://" aria-label={`${b.label} URL`} className="input" />
          </div>
        ))}
      </fieldset>
    </>
  );
}
