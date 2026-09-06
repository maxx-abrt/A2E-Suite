import { useQuery } from '@apollo/client/react';
import { renderHook } from '@testing-library/react';

import { useA2eSuiteApplications } from '~/modules/a2e-workspace/hooks/useA2eSuiteApplications';

const A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER =
  '19126a9c-7cc0-4368-aaba-c7e5a87b0c48';

jest.mock('@apollo/client/react', () => ({
  useQuery: jest.fn(),
}));

const mockedUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

// The hook issues two queries: workspace installs (FindManyApplications)
// and the marketplace catalog (FindManyMarketplaceApps), dispatched by
// document shape.
const mockQueries = ({
  installedApplications,
  catalogApps,
}: {
  installedApplications?: Record<string, unknown>[];
  catalogApps?: Record<string, unknown>[];
}) => {
  mockedUseQuery.mockImplementation(((document: { definitions: unknown[] }) => {
    const isCatalogQuery = JSON.stringify(document).includes(
      'findManyMarketplaceApps',
    );

    return isCatalogQuery
      ? { data: { findManyMarketplaceApps: catalogApps ?? [] } }
      : { data: { findManyApplications: installedApplications ?? [] } };
  }) as never);
};

const buildApplication = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'Application',
  id: 'application-id',
  name: 'A2E Documents',
  description: 'Workspace documents',
  logoUrl: null,
  version: '0.1.0',
  universalIdentifier: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
  applicationRegistrationId: null,
  applicationRegistration: null,
  ...overrides,
});

const buildCatalogApp = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'MarketplaceApp',
  id: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER,
  name: 'A2E Documents',
  description: 'Workspace documents',
  author: 'A2E',
  category: 'productivity',
  logoUrl: null,
  sourcePackage: null,
  isVetted: true,
  ...overrides,
});

describe('useA2eSuiteApplications', () => {
  it('returns nothing when no A2E app is published or installed', () => {
    mockQueries({
      installedApplications: [
        buildApplication({
          id: 'other-id',
          universalIdentifier: '0dc70098-ce83-430a-bb37-d5b5f2790b99',
        }),
      ],
    });

    const { result } = renderHook(() => useA2eSuiteApplications());

    expect(result.current.installedApplications).toEqual([]);
    expect(result.current.availableApplications).toEqual([]);
  });

  it('splits installed and available A2E applications', () => {
    mockQueries({
      installedApplications: [buildApplication({ id: 'installed-id' })],
      catalogApps: [
        buildCatalogApp({ id: A2E_DOCUMENTS_UNIVERSAL_IDENTIFIER }),
        buildCatalogApp({
          id: 'e7942c52-69db-4b41-aef2-9c5f3a2b2f9e',
          name: 'A2E Projects',
        }),
      ],
    });

    const { result } = renderHook(() => useA2eSuiteApplications());

    expect(result.current.installedApplications).toHaveLength(1);
    expect(result.current.installedApplications[0]?.id).toBe('installed-id');
    // the installed one disappears from the available cards
    expect(result.current.availableApplications).toHaveLength(1);
    expect(result.current.availableApplications[0]?.name).toBe('A2E Projects');
  });

  it('lists a catalog app as available when it is not installed yet', () => {
    mockQueries({
      installedApplications: [],
      catalogApps: [buildCatalogApp()],
    });

    const { result } = renderHook(() => useA2eSuiteApplications());

    expect(result.current.installedApplications).toEqual([]);
    expect(result.current.availableApplications).toHaveLength(1);
  });

  it('lists nothing when the queries have no data yet', () => {
    mockQueries({ installedApplications: undefined, catalogApps: undefined });

    const { result } = renderHook(() => useA2eSuiteApplications());

    expect(result.current.installedApplications).toEqual([]);
    expect(result.current.availableApplications).toEqual([]);
  });
});
