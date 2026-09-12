import { AppPath } from 'twenty-shared/types';

import { getLogoutRedirectUrl } from '@/auth/utils/getLogoutRedirectUrl';

describe('getLogoutRedirectUrl', () => {
  it.each([
    'http://localhost:3002',
    'https://www.example.com/',
    'https://public.example.com/fr/landing?source=logout',
    'https://example.trycloudflare.com/',
  ])(
    'returns the configured landing page URL exactly for %s',
    (landingPageUrl) => {
      const result = getLogoutRedirectUrl({ landingPageUrl });

      expect(result).toBe(landingPageUrl);
    },
  );

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['whitespace', '   '],
  ])(
    'returns AppPath.SignInUp when landingPageUrl is %s',
    (_label, landingPageUrl) => {
      const result = getLogoutRedirectUrl({ landingPageUrl });

      expect(result).toBe(AppPath.SignInUp);
    },
  );
});
