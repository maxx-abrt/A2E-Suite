export const formatHomeWidgetDayLabel = (timestamp: string): string => {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    i18n.locale === 'pseudo-en' ? SOURCE_LOCALE : i18n.locale || SOURCE_LOCALE,
    {
      day: 'numeric',
      month: 'short',
    },
  );
};
import { i18n } from '@lingui/core';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
