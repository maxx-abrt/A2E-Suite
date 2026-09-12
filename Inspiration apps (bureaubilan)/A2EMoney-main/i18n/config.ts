export type Locale = 'en' | 'fr';

export const locales: Locale[] = ['en', 'fr'];
export const defaultLocale: Locale = 'fr';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
};
