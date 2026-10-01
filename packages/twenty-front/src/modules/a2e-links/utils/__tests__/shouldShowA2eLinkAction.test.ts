import { shouldShowA2eLinkAction } from '@/a2e-links/utils/shouldShowA2eLinkAction';

describe('shouldShowA2eLinkAction', () => {
  it('shows on a linkable source object when a2e-links is installed', () => {
    expect(
      shouldShowA2eLinkAction({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'document',
      }),
    ).toBe(true);

    expect(
      shouldShowA2eLinkAction({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'task',
      }),
    ).toBe(true);
  });

  it('is hidden without a2e-links, even on a linkable object', () => {
    expect(
      shouldShowA2eLinkAction({
        isA2eLinksApplicationInstalled: false,
        sourceObjectNameSingular: 'document',
      }),
    ).toBe(false);
  });

  it('is hidden on an object with no declared morph leg', () => {
    expect(
      shouldShowA2eLinkAction({
        isA2eLinksApplicationInstalled: true,
        sourceObjectNameSingular: 'company',
      }),
    ).toBe(false);
  });
});
