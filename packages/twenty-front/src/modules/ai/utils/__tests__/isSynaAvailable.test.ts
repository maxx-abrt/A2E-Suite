import { isSynaAvailable } from '@/ai/utils/isSynaAvailable';

describe('isSynaAvailable', () => {
  it.each([
    {
      hasAiPermissionFlag: true,
      hasConfiguredAiProvider: true,
      expected: true,
    },
    {
      hasAiPermissionFlag: true,
      hasConfiguredAiProvider: false,
      expected: false,
    },
    {
      hasAiPermissionFlag: false,
      hasConfiguredAiProvider: true,
      expected: false,
    },
    {
      hasAiPermissionFlag: false,
      hasConfiguredAiProvider: false,
      expected: false,
    },
  ])(
    'maps AI flag $hasAiPermissionFlag / provider $hasConfiguredAiProvider to $expected',
    ({ hasAiPermissionFlag, hasConfiguredAiProvider, expected }) => {
      expect(
        isSynaAvailable({ hasAiPermissionFlag, hasConfiguredAiProvider }),
      ).toBe(expected);
    },
  );
});
