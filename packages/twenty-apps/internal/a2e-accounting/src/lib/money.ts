// Twenty stores money as a CURRENCY composite: { amountMicros, currencyCode }.
// Everything in Bilan computes in micros (integers) so no cent is ever lost to
// floating point, and only formats at the very edge of the UI.

export const MICROS_PER_UNIT = 1_000_000;

export const DEFAULT_CURRENCY_CODE = 'EUR';

export type Money = {
  amountMicros: number;
  currencyCode: string;
};

export const roundHalfUp = (value: number): number =>
  value < 0 ? -Math.round(-value) : Math.round(value);

export const toMicros = (amount: number): number =>
  roundHalfUp(amount * MICROS_PER_UNIT);

export const fromMicros = (micros: number): number => micros / MICROS_PER_UNIT;

export const money = (
  amountMicros: number,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): Money => ({ amountMicros: roundHalfUp(amountMicros), currencyCode });

export const moneyFromAmount = (
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): Money => money(toMicros(amount), currencyCode);

export const addMoney = (left: Money, right: Money): Money => {
  if (left.currencyCode !== right.currencyCode) {
    throw new Error(
      `Cannot add ${left.currencyCode} to ${right.currencyCode}: convert first`,
    );
  }

  return money(left.amountMicros + right.amountMicros, left.currencyCode);
};

export const sumMoney = (
  values: Money[],
  currencyCode: string = DEFAULT_CURRENCY_CODE,
): Money =>
  values.reduce(
    (total, value) => addMoney(total, value),
    money(0, values[0]?.currencyCode ?? currencyCode),
  );

export const applyPercent = (value: Money, percent: number): Money =>
  money(roundHalfUp((value.amountMicros * percent) / 100), value.currencyCode);

export const formatMoney = (
  value: Money,
  locale: string = 'fr-FR',
): string =>
  new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currencyCode,
  }).format(fromMicros(value.amountMicros));

export const formatPercent = (
  value: number,
  locale: string = 'fr-FR',
  maximumFractionDigits = 1,
): string =>
  new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits,
  }).format(value / 100);
