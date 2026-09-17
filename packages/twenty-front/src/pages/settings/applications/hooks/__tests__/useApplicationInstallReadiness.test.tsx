import { useQuery } from '@apollo/client/react';
import { renderHook } from '@testing-library/react';

import { useApplicationInstallReadiness } from '~/pages/settings/applications/hooks/useApplicationInstallReadiness';

jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
}));

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

const buildReadiness = (overrides: Record<string, unknown> = {}) => ({
  universalIdentifier: '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
  registered: true,
  versionCompatible: true,
  currentlyInstalled: false,
  ready: true,
  blockedReason: null,
  ...overrides,
});

describe('useApplicationInstallReadiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps readiness entries by universal identifier', () => {
    mockedUseQuery.mockReturnValue({
      data: {
        applicationInstallReadiness: [
          buildReadiness(),
          buildReadiness({
            universalIdentifier: 'e7942c52-69db-4b41-aef2-9c5f3a2b2f9e',
            registered: false,
            versionCompatible: false,
            ready: false,
            blockedReason: 'APP_NOT_REGISTERED',
          }),
        ],
      },
      loading: false,
      error: undefined,
    } as never);

    const { result } = renderHook(() =>
      useApplicationInstallReadiness({
        universalIdentifiers: [
          '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
          'e7942c52-69db-4b41-aef2-9c5f3a2b2f9e',
        ],
      }),
    );

    expect(result.current.readinessByIdentifier.size).toBe(2);
    expect(
      result.current.readinessByIdentifier.get(
        'e7942c52-69db-4b41-aef2-9c5f3a2b2f9e',
      )?.blockedReason,
    ).toBe('APP_NOT_REGISTERED');
    expect(
      result.current.readinessByIdentifier.get(
        '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
      )?.ready,
    ).toBe(true);
  });

  it('skips the query and returns an empty map when no identifier is given', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as never);

    const { result } = renderHook(() =>
      useApplicationInstallReadiness({ universalIdentifiers: [] }),
    );

    expect(result.current.readinessByIdentifier.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(mockedUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });

  it('reports loading only while identifiers are requested', () => {
    mockedUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    } as never);

    const { result } = renderHook(() =>
      useApplicationInstallReadiness({
        universalIdentifiers: ['19126a9c-7cc0-4368-aaba-c7e5a87b0c48'],
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.readinessByIdentifier.size).toBe(0);
  });
});
