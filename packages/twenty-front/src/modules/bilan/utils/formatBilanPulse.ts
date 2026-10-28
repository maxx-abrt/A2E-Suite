import { BILAN_FALLBACK_CURRENCY_CODE } from '@/bilan/utils/buildBilanPulse';

const MICROS_PER_UNIT = 1_000_000;
const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export const getBilanLocale = (locale?: string): string =>
  locale === 'pseudo-en' ? 'en' : locale || 'en';

const getCurrencyCode = (currencyCode?: string): string => {
  const normalizedCode = currencyCode?.trim().toUpperCase() ?? '';

  return CURRENCY_CODE_PATTERN.test(normalizedCode)
    ? normalizedCode
    : BILAN_FALLBACK_CURRENCY_CODE;
};

export const formatBilanMoney = (
  amountMicros: number,
  currencyCode: string,
  locale: string,
  options: { compact?: boolean; maximumFractionDigits?: number } = {},
): string => {
  const maximumFractionDigits =
    options.maximumFractionDigits ?? (options.compact ? 1 : 0);

  return new Intl.NumberFormat(getBilanLocale(locale), {
    style: 'currency',
    currency: getCurrencyCode(currencyCode),
    notation: options.compact ? 'compact' : 'standard',
    maximumFractionDigits,
  }).format(amountMicros / MICROS_PER_UNIT);
};

export const formatBilanSignedMoney = (
  amountMicros: number,
  currencyCode: string,
  locale: string,
): string => {
  const sign = amountMicros >= 0 ? '+' : '−';

  return `${sign}${formatBilanMoney(Math.abs(amountMicros), currencyCode, locale)}`;
};

export const formatBilanPercent = (
  value: number,
  locale: string,
  maximumFractionDigits = 0,
): string =>
  new Intl.NumberFormat(getBilanLocale(locale), {
    style: 'percent',
    maximumFractionDigits,
  }).format(value / 100);

export const formatBilanMonthShort = (
  monthStart: string,
  locale: string,
): string => {
  const date = new Date(monthStart);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(getBilanLocale(locale), {
    month: 'short',
  }).format(date);
};

export const formatBilanMonthLong = (date: Date, locale: string): string =>
  new Intl.DateTimeFormat(getBilanLocale(locale), {
    month: 'long',
    year: 'numeric',
  }).format(date);

export const formatBilanDate = (
  value?: string | null,
  locale = 'en',
): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(getBilanLocale(locale), {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export const formatBilanDateTime = (
  value?: string | null,
  locale = 'en',
): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(getBilanLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
