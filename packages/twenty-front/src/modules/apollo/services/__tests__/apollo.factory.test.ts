import { gql, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import fetchMock, { enableFetchMocks } from 'jest-fetch-mock';

import { ApolloFactory, type Options } from '@/apollo/services/apollo.factory';
import { CUSTOM_WORKSPACE_APPLICATION_MOCK } from '@/object-metadata/hooks/__tests__/constants/CustomWorkspaceApplicationMock.test.constant';
import {
  AUTO_SELECT_FAST_MODEL_ID,
  AUTO_SELECT_SMART_MODEL_ID,
  WORKSPACE_REQUEST_HEADER,
} from 'twenty-shared/constants';
import {
  WorkspaceActivationStatus,
  WorkspaceDiscoverability,
} from '~/generated-metadata/graphql';

enableFetchMocks();

jest.mock('~/utils/sleep', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

const UNAUTHENTICATED_RESPONSE = JSON.stringify({
  data: {},
  errors: [{ extensions: { code: 'UNAUTHENTICATED' } }],
});

const PERMISSION_DENIED_RESPONSE = JSON.stringify({
  data: { trackAnalytics: null },
  errors: [
    {
      message: 'Entity performing the request does not have permission',
      extensions: { code: 'FORBIDDEN' },
    },
  ],
});

const mockOnError = jest.fn();
const mockOnNetworkError = jest.fn();
const mockOnPayloadTooLarge = jest.fn();
const mockOnUnauthenticatedError = jest.fn();
const mockOnWorkspaceContextMismatch = jest.fn();

const mockWorkspaceMember = {
  id: 'workspace-member-id',
  locale: 'en',
  name: {
    firstName: 'John',
    lastName: 'Doe',
  },
  colorScheme: 'Light' as const,
  userEmail: 'userEmail',
};

const mockWorkspace = {
  id: 'workspace-id',
  metadataVersion: 1,
  allowImpersonation: false,
  activationStatus: WorkspaceActivationStatus.ACTIVE,
  billingSubscriptions: [],
  billingEntitlements: [],
  currentBillingSubscription: null,
  workspaceMembersCount: 0,
  isPublicInviteLinkEnabled: false,
  workspaceDiscoverability: WorkspaceDiscoverability.PUBLIC,
  isGoogleAuthEnabled: false,
  isMicrosoftAuthEnabled: false,
  isPasswordAuthEnabled: false,
  isCustomDomainEnabled: false,
  isGoogleAuthBypassEnabled: false,
  isPasswordAuthBypassEnabled: false,
  isMicrosoftAuthBypassEnabled: false,
  hasActivatedAndValidEnterpriseKey: false,
  hasValidSignedEnterpriseKey: false,
  hasValidEnterpriseValidityToken: false,
  subdomain: 'test',
  customDomain: 'test.com',
  workspaceUrls: {
    subdomainUrl: 'test.com',
    customUrl: 'test.com',
  },
  isTwoFactorAuthenticationEnforced: false,
  trashRetentionDays: 14,
  eventLogRetentionDays: 365 * 3,
  fastModel: AUTO_SELECT_FAST_MODEL_ID,
  smartModel: AUTO_SELECT_SMART_MODEL_ID,
  routerModel: 'auto',
  enabledAiModelIds: [],
  useRecommendedModels: true,
  isInternalMessagesImportEnabled: false,
  workspaceCustomApplication: CUSTOM_WORKSPACE_APPLICATION_MOCK,
  workspaceCustomApplicationId: CUSTOM_WORKSPACE_APPLICATION_MOCK.id,
  installedApplications: [],
};

const createMockOptions = (): Options => ({
  uri: 'http://localhost:3000',
  currentWorkspaceMember: mockWorkspaceMember,
  currentWorkspace: mockWorkspace,
  cache: new InMemoryCache(),
  isDebugMode: true,
  onError: mockOnError,
  onNetworkError: mockOnNetworkError,
  onPayloadTooLarge: mockOnPayloadTooLarge,
  onUnauthenticatedError: mockOnUnauthenticatedError,
  onWorkspaceContextMismatch: mockOnWorkspaceContextMismatch,
  appVersion: '1.0.0',
});

const makeRequestWithContext = async (
  context?: Record<string, unknown>,
  apolloFactory = new ApolloFactory(createMockOptions()),
) => {
  const client = apolloFactory.getClient();

  await client.mutate({
    context,
    mutation: gql`
      mutation TrackAnalytics(
        $type: AnalyticsType!
        $event: String
        $name: String
        $properties: JSON
      ) {
        trackAnalytics(
          type: $type
          event: $event
          name: $name
          properties: $properties
        ) {
          success
        }
      }
    `,
  });
};

const makeRequest = async () => makeRequestWithContext();

describe('ApolloFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
  });

  it('should create an instance of ApolloFactory', () => {
    const options = createMockOptions();
    const apolloFactory = new ApolloFactory(options);
    expect(apolloFactory).toBeInstanceOf(ApolloFactory);
  });

  it('should initialize with the correct workspace member', () => {
    const options = createMockOptions();
    const apolloFactory = new ApolloFactory(options);
    expect(apolloFactory['currentWorkspaceMember']).toEqual(
      mockWorkspaceMember,
    );
  });

  it('should call onError when encountering "Unauthorized" error', async () => {
    const errors = [{ message: 'Unauthorized' }];
    fetchMock.mockResponse(() =>
      Promise.resolve({
        body: JSON.stringify({
          data: {},
          errors,
        }),
      }),
    );
    try {
      await makeRequest();
    } catch (error) {
      expect(error).toBeInstanceOf(CombinedGraphQLErrors);
      expect((error as CombinedGraphQLErrors).message).toBe('Unauthorized');
      expect(mockOnError).toHaveBeenCalledWith(errors);
    }
  }, 10000);

  it('should call onError when encountering "UNAUTHENTICATED" error', async () => {
    const errors = [
      {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      },
    ];
    fetchMock.mockResponse(() =>
      Promise.resolve({
        body: JSON.stringify({
          data: {},
          errors,
        }),
      }),
    );

    try {
      await makeRequest();
    } catch (error) {
      expect(error).toBeInstanceOf(CombinedGraphQLErrors);
      expect((error as CombinedGraphQLErrors).message).toBe(
        'Error message not found.',
      );
      expect(mockOnError).toHaveBeenCalledWith(errors);
    }
  }, 10000);

  it('should call onNetworkError when encountering a network error', async () => {
    const errors = [
      {
        message: 'Unknown error',
      },
    ];
    fetchMock.mockResponse(() =>
      Promise.resolve({
        body: JSON.stringify({
          data: {},
          errors,
        }),
      }),
    );

    try {
      await makeRequest();
    } catch (error) {
      expect(error).toBeInstanceOf(CombinedGraphQLErrors);
      expect((error as CombinedGraphQLErrors).message).toBe('Unknown error');
      expect(mockOnError).toHaveBeenCalledWith(errors);
    }
  }, 10000);

  it('should call onNetworkError when the request itself fails', async () => {
    fetchMock.mockReject(() => Promise.reject({ message: 'Unknown error' }));

    try {
      await makeRequest();
    } catch (error) {
      expect(error).toBeDefined();
      expect(mockOnNetworkError).toHaveBeenCalled();
    }
  }, 10000);

  it('should update workspace member when calling updateWorkspaceMember', () => {
    const options = createMockOptions();
    const apolloFactory = new ApolloFactory(options);

    const newWorkspaceMember = {
      id: 'new-workspace-member-id',
      locale: 'fr',
      name: {
        firstName: 'John',
        lastName: 'Doe',
      },
      colorScheme: 'Light' as const,
      userEmail: 'userEmail',
    };

    apolloFactory.updateWorkspaceMember(newWorkspaceMember);
    expect(apolloFactory['currentWorkspaceMember']).toEqual(newWorkspaceMember);
  });

  it('should call onPayloadTooLarge when encountering a 413 error', async () => {
    fetchMock.mockResponse(() =>
      Promise.resolve({
        status: 413,
        body: 'Payload Too Large',
      }),
    );

    try {
      await makeRequest();
    } catch {
      expect(mockOnPayloadTooLarge).toHaveBeenCalledWith(
        expect.stringContaining('Uploaded content is too large'),
      );
    }
  }, 10000);

  // fetch normalises header names, so assert case-insensitively rather than
  // depending on the casing the mock happens to expose.
  const readHeader = (
    headers: Record<string, string>,
    name: string,
  ): string | undefined =>
    Object.entries(headers).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1];

  it('should not attach an Authorization header', async () => {
    fetchMock.mockResponse(() =>
      Promise.resolve({ body: JSON.stringify({ data: {} }) }),
    );

    await makeRequest();

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;

    expect(readHeader(headers, 'authorization')).toBeUndefined();
    // Version-mismatch detection must keep working without one.
    expect(readHeader(headers, 'X-App-Version')).toBe('1.0.0');
    expect(readHeader(headers, 'x-workspace-id')).toBe(mockWorkspace.id);
  });

  it('keeps workspace assertions independent between clients in different tabs', async () => {
    fetchMock.mockResponse(JSON.stringify({ data: {} }));
    const firstTab = new ApolloFactory(createMockOptions());
    const secondWorkspace = { ...mockWorkspace, id: 'second-workspace-id' };
    const secondTab = new ApolloFactory({
      ...createMockOptions(),
      currentWorkspace: secondWorkspace,
    });

    await makeRequestWithContext(undefined, firstTab);
    await makeRequestWithContext(undefined, secondTab);
    await makeRequestWithContext(undefined, firstTab);

    const workspaceHeaders = fetchMock.mock.calls.map(([, options]) =>
      readHeader(
        options?.headers as Record<string, string>,
        WORKSPACE_REQUEST_HEADER,
      ),
    );

    expect(workspaceHeaders).toEqual([
      mockWorkspace.id,
      secondWorkspace.id,
      mockWorkspace.id,
    ]);
  });

  it('omits the workspace assertion for global account requests', async () => {
    fetchMock.mockResponse(JSON.stringify({ data: {} }));
    const factory = new ApolloFactory({
      ...createMockOptions(),
      currentWorkspace: null,
    });

    await makeRequestWithContext(undefined, factory);

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;

    expect(readHeader(headers, WORKSPACE_REQUEST_HEADER)).toBeUndefined();
  });

  it('preserves an in-flight request workspace when the current workspace changes', async () => {
    const factory = new ApolloFactory(createMockOptions());

    fetchMock.mockResponseOnce(async () => {
      factory.updateCurrentWorkspace({
        ...mockWorkspace,
        id: 'next-workspace-id',
      });

      return JSON.stringify({ data: {} });
    });
    fetchMock.mockResponse(JSON.stringify({ data: {} }));

    await makeRequestWithContext(undefined, factory);
    await makeRequestWithContext(undefined, factory);

    expect(
      fetchMock.mock.calls.map(([, options]) =>
        readHeader(
          options?.headers as Record<string, string>,
          WORKSPACE_REQUEST_HEADER,
        ),
      ),
    ).toEqual([mockWorkspace.id, 'next-workspace-id']);
  });

  it('reports a workspace mismatch without signing out or retrying', async () => {
    fetchMock.mockResponse(
      JSON.stringify({
        errors: [
          {
            message:
              'Request workspace does not match the authenticated workspace',
            extensions: {
              code: 'FORBIDDEN',
              subCode: 'WORKSPACE_CONTEXT_MISMATCH',
            },
          },
        ],
      }),
    );

    await expect(makeRequest()).rejects.toBeInstanceOf(CombinedGraphQLErrors);

    expect(mockOnWorkspaceContextMismatch).toHaveBeenCalledTimes(1);
    expect(mockOnUnauthenticatedError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // The session cookie is issued and refreshed server-side, so a rejection is
  // the end of the session rather than something the client can retry.
  it('should sign out on an unauthenticated response', async () => {
    fetchMock.mockResponse(UNAUTHENTICATED_RESPONSE);

    await expect(makeRequest()).rejects.toBeInstanceOf(CombinedGraphQLErrors);

    expect(mockOnUnauthenticatedError).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should leave a permission denial alone', async () => {
    fetchMock.mockResponse(PERMISSION_DENIED_RESPONSE);

    await expect(makeRequest()).rejects.toBeInstanceOf(CombinedGraphQLErrors);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockOnUnauthenticatedError).not.toHaveBeenCalled();
  });
});
