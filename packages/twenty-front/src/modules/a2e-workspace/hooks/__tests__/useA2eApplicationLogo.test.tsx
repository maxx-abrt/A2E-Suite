import { useA2eApplicationLogo } from '@/a2e-workspace/hooks/useA2eApplicationLogo';
import { useApplicationChipData } from '@/applications/hooks/useApplicationChipData';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { renderHook } from '@testing-library/react';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock('@/applications/hooks/useApplicationAvatarColors', () => ({
  useApplicationAvatarColors: () => undefined,
}));

const BUREAU_IDENTIFIER = '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

describe('application identity', () => {
  beforeEach(() => {
    jest.mocked(useAtomStateValue).mockReturnValue({
      installedApplications: [
        {
          id: 'platform-app',
          universalIdentifier: '20202020-64aa-4b6f-b003-9c74b97cee20',
          name: 'Standard',
          logoUrl: null,
        },
        {
          id: 'local-app',
          universalIdentifier: BUREAU_IDENTIFIER,
          name: 'Renamed knowledge space',
          logoUrl: 'https://example.com/old.png',
        },
        {
          id: 'third-party',
          universalIdentifier: 'other-app',
          name: 'Bureau',
          logoUrl: 'https://example.com/custom.png',
        },
      ],
    });
  });

  it('keeps the Bureau logo when the workspace app is renamed', () => {
    const { result } = renderHook(() => useA2eApplicationLogo('local-app'));
    expect(result.current).toBe('/branding/bureau.png');
  });

  it('preserves another application even when it has the same display name', () => {
    const { result } = renderHook(() => useA2eApplicationLogo('third-party'));
    expect(result.current).toBeUndefined();
  });

  it('does not brand personal folders or unavailable applications', () => {
    const { result } = renderHook(() => useA2eApplicationLogo(null));
    expect(result.current).toBeUndefined();
  });

  it('keeps platform-owned folders semantic while branding the platform chip', () => {
    const folder = renderHook(() => useA2eApplicationLogo('platform-app'));
    const chip = renderHook(() =>
      useApplicationChipData({ applicationId: 'platform-app' }),
    );
    expect(folder.result.current).toBeUndefined();
    expect(chip.result.current.applicationChipData.brandLogo).toBe(
      '/branding/suite.png',
    );
  });

  it('resolves the same logo before installation for catalog details', () => {
    const { result } = renderHook(() =>
      useApplicationChipData({
        fallbackApplicationData: {
          universalIdentifier: BUREAU_IDENTIFIER,
          name: 'Bureau',
        },
      }),
    );
    expect(result.current.applicationChipData.brandLogo).toBe(
      '/branding/bureau.png',
    );
  });

  it('keeps third-party logos in application chips', () => {
    const { result } = renderHook(() =>
      useApplicationChipData({ applicationId: 'third-party' }),
    );
    expect(result.current.applicationChipData.brandLogo).toBeUndefined();
    expect(result.current.applicationChipData.logo).toBe(
      'https://example.com/custom.png',
    );
  });
});
