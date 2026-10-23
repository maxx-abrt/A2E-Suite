import { fromStorage, fromUrl } from '@lingui/detect-locale';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined, isValidLocale, normalizeLocale } from 'twenty-shared/utils';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const getExplicitLocale = (value: string | null) => {
  if (!isDefined(value) || value.trim() === '') return null;
  const locale = normalizeLocale(value);
  // normalizeLocale defaults unknown input to English. An invalid URL must
  // not override a valid saved preference with that fallback.
  if (locale === SOURCE_LOCALE && value.toLowerCase().split('-')[0] !== 'en') {
    return null;
  }
  return isValidLocale(locale) ? locale : null;
};

export const initialI18nActivate = () => {
  const urlLocale = getExplicitLocale(fromUrl('locale'));
  let storageLocale = null;
  try {
    storageLocale = getExplicitLocale(fromStorage('locale'));
  } catch {
    // Privacy settings can disable browser storage; English stays usable.
  }

  if (isDefined(urlLocale)) {
    try {
      localStorage.setItem('locale', urlLocale);
    } catch {
      // The explicit selection remains usable without browser storage.
    }
  }
  return dynamicActivate(urlLocale ?? storageLocale ?? SOURCE_LOCALE);
};
