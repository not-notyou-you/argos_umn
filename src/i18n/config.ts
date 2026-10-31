export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'id';
export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale);
