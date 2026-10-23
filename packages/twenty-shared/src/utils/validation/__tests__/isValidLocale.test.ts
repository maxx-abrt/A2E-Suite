import { APP_LOCALES } from '@/translations';
import { isValidLocale } from '@/utils/validation/isValidLocale';
describe('isValidLocale', () => {
  it('should return true for valid locales', () => {
    Object.keys(APP_LOCALES).forEach((locale) => {
      expect(isValidLocale(locale)).toBe(true);
    });
  });

  it('should return false for invalid locales', () => {
    expect(isValidLocale('invalidLocale')).toBe(false);
    expect(isValidLocale(null)).toBe(false);
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'rejects inherited property %s as a locale',
    (value) => {
      expect(isValidLocale(value)).toBe(false);
    },
  );
});
