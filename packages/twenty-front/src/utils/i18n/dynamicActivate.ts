import { i18n } from '@lingui/core';
import { APP_LOCALES, SOURCE_LOCALE } from 'twenty-shared/translations';
import { messages as englishMessages } from '~/locales/generated/en';
import { loadLocaleCatalog } from '~/utils/i18n/loadLocaleCatalog';
import { logError } from '~/utils/logError';

let latestActivationRequest = 0;

export const dynamicActivate = async (
  locale: keyof typeof APP_LOCALES,
  { canActivate = () => true }: { canActivate?: () => boolean } = {},
) => {
  const activationRequest = ++latestActivationRequest;
  if (!Object.values(APP_LOCALES).includes(locale)) {
    // oxlint-disable-next-line no-console
    console.warn(`Invalid locale "${locale}", defaulting to "en"`);
    locale = SOURCE_LOCALE;
  }
  let messages = englishMessages;
  if (locale !== SOURCE_LOCALE) {
    try {
      messages = {
        ...englishMessages,
        ...(await loadLocaleCatalog(locale)).messages,
      };
    } catch (error) {
      if (activationRequest !== latestActivationRequest) return null;
      logError(error);
      locale = SOURCE_LOCALE;
    }
  }

  // A slow catalog from a previous account or selection must not win over
  // the language requested by the current member.
  if (activationRequest !== latestActivationRequest || !canActivate())
    return null;
  i18n.load(locale, messages);
  i18n.activate(locale);
  document.documentElement.lang =
    locale === 'pseudo-en' ? SOURCE_LOCALE : locale;
  document.documentElement.dir =
    locale === 'ar-SA' || locale === 'he-IL' ? 'rtl' : 'ltr';
  return locale;
};
