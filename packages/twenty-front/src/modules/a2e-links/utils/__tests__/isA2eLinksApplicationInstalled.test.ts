import { isA2eLinksApplicationInstalled } from '@/a2e-links/utils/isA2eLinksApplicationInstalled';

describe('isA2eLinksApplicationInstalled', () => {
  it('is true when the a2e-links identifier is present', () => {
    expect(
      isA2eLinksApplicationInstalled([
        '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
        '895bb7aa-3ae3-400f-9dfa-72116f0021e2',
      ]),
    ).toBe(true);
  });

  it('is false when only other apps are installed', () => {
    expect(
      isA2eLinksApplicationInstalled(['19126a9c-7cc0-4368-aaba-c7e5a87b0c48']),
    ).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(isA2eLinksApplicationInstalled([])).toBe(false);
  });
});
