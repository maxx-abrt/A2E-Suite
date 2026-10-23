import { initialI18nActivate } from '~/utils/i18n/initialI18nActivate';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

jest.mock('~/utils/i18n/dynamicActivate', () => ({
  dynamicActivate: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('starts in English even when the browser uses another language', () => {
  jest.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');
  initialI18nActivate();
  expect(dynamicActivate).toHaveBeenCalledWith('en');
});

it('restores an explicit saved preference', () => {
  localStorage.setItem('locale', 'fr-FR');
  initialI18nActivate();
  expect(dynamicActivate).toHaveBeenCalledWith('fr-FR');
});

it('honors and normalizes an explicit URL language', () => {
  localStorage.setItem('locale', 'fr-FR');
  window.history.replaceState({}, '', '/?locale=de');
  initialI18nActivate();
  expect(dynamicActivate).toHaveBeenCalledWith('de-DE');
  expect(localStorage.getItem('locale')).toBe('de-DE');
});

it.each(['unknown', 'constructor', '__proto__'])(
  'ignores unsupported URL language %s instead of erasing a saved preference',
  (locale) => {
    localStorage.setItem('locale', 'fr-FR');
    window.history.replaceState({}, '', `/?locale=${locale}`);
    initialI18nActivate();
    expect(dynamicActivate).toHaveBeenCalledWith('fr-FR');
    expect(localStorage.getItem('locale')).toBe('fr-FR');
  },
);

it('still starts when browser storage is blocked', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  initialI18nActivate();
  expect(dynamicActivate).toHaveBeenCalledWith('en');
});
