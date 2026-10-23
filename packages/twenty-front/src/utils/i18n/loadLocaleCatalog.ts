import { type Messages } from '@lingui/core';
import { type AppLocale } from 'twenty-shared/translations';

export const loadLocaleCatalog = (
  locale: AppLocale,
): Promise<{ messages: Messages }> =>
  import(`../../locales/generated/${locale}.ts`);
