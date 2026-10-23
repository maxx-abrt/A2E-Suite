import { i18n } from '@lingui/core';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';
import { loadLocaleCatalog } from '~/utils/i18n/loadLocaleCatalog';
import { logError } from '~/utils/logError';

jest.mock('~/utils/i18n/loadLocaleCatalog', () => ({
  loadLocaleCatalog: jest.fn(),
}));
jest.mock('~/utils/logError', () => ({ logError: jest.fn() }));
const mockedLoadCatalog = jest.mocked(loadLocaleCatalog);

beforeEach(async () => {
  jest.clearAllMocks();
  mockedLoadCatalog.mockResolvedValue({ messages: {} });
  await dynamicActivate('en');
});

it('activates a language and updates document language and reading direction', async () => {
  expect(await dynamicActivate('ar-SA')).toBe('ar-SA');
  expect(i18n.locale).toBe('ar-SA');
  expect(document.documentElement.lang).toBe('ar-SA');
  expect(document.documentElement.dir).toBe('rtl');
  await dynamicActivate('fr-FR');
  expect(document.documentElement.lang).toBe('fr-FR');
  expect(document.documentElement.dir).toBe('ltr');
});

it('keeps English available when a translation chunk cannot be loaded', async () => {
  mockedLoadCatalog.mockRejectedValue(new Error('offline'));
  expect(await dynamicActivate('fr-FR')).toBe('en');
  expect(i18n.locale).toBe('en');
  expect(document.documentElement.lang).toBe('en');
  expect(logError).toHaveBeenCalled();
});

it('uses the English source catalog for messages missing from a translated bundle', async () => {
  await dynamicActivate('fr-FR');
  expect(i18n._('Rb75HO')).toBe('Daily work');
});

it('keeps the latest selection when an earlier catalog loads late', async () => {
  let resolveCatalog: (
    catalog: Awaited<ReturnType<typeof loadLocaleCatalog>>,
  ) => void = () => {};
  mockedLoadCatalog.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCatalog = resolve;
    }),
  );
  const previousSelection = dynamicActivate('fr-FR');
  await dynamicActivate('en');
  resolveCatalog({ messages: {} });
  expect(await previousSelection).toBeNull();
  expect(i18n.locale).toBe('en');
});

it('does not apply a catalog after the requesting account has changed', async () => {
  let isCurrentMember = true;
  let resolveCatalog: (
    catalog: Awaited<ReturnType<typeof loadLocaleCatalog>>,
  ) => void = () => {};
  mockedLoadCatalog.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCatalog = resolve;
    }),
  );
  const pendingSelection = dynamicActivate('he-IL', {
    canActivate: () => isCurrentMember,
  });
  isCurrentMember = false;
  resolveCatalog({ messages: {} });
  expect(await pendingSelection).toBeNull();
  expect(i18n.locale).toBe('en');
});
