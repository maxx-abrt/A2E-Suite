import { renderHook } from '@testing-library/react';
import { useApolloClient } from '@apollo/client/react';

import { useDocumentRevisionPersistence } from '@/blocknote-editor/version-history/hooks/useDocumentRevisionPersistence';

jest.mock('@apollo/client/react', () => ({
  useApolloClient: jest.fn(),
}));

const mockedUseApolloClient = useApolloClient as jest.MockedFunction<
  typeof useApolloClient
>;

const DOCUMENT_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildRevisionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'row-1',
  versionId: 'version-1',
  body: '{"v":1}',
  createdAt: '2026-09-17T10:00:00.000Z',
  ...overrides,
});

const buildClientMock = (rows: Record<string, unknown>[]) => ({
  query: jest.fn().mockResolvedValue({
    data: { documentRevisions: { edges: rows.map((node) => ({ node })) } },
  }),
  mutate: jest.fn().mockResolvedValue({ data: {} }),
});

const mockClient = (client: ReturnType<typeof buildClientMock>) => {
  mockedUseApolloClient.mockReturnValue(client as never);

  return client;
};

describe('useDocumentRevisionPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps persisted rows to snapshots and drops malformed ones', async () => {
    const client = mockClient(
      buildClientMock([
        buildRevisionRow(),
        buildRevisionRow({ id: 'row-2', versionId: null }),
      ]),
    );

    const { result } = renderHook(() =>
      useDocumentRevisionPersistence({ documentId: DOCUMENT_ID }),
    );

    await expect(result.current.loadVersions()).resolves.toEqual([
      {
        versionId: 'version-1',
        createdAt: '2026-09-17T10:00:00.000Z',
        body: '{"v":1}',
      },
    ]);
    expect(client.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { documentId: DOCUMENT_ID },
        fetchPolicy: 'no-cache',
      }),
    );
  });

  it('creates a revision when no row exists for the version id', async () => {
    const client = mockClient(buildClientMock([]));

    const { result } = renderHook(() =>
      useDocumentRevisionPersistence({ documentId: DOCUMENT_ID }),
    );

    await result.current.saveVersion({
      versionId: 'version-1',
      createdAt: '2026-09-17T10:00:00.000Z',
      body: '{"v":1}',
    });

    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(client.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          data: {
            versionId: 'version-1',
            body: '{"v":1}',
            documentId: DOCUMENT_ID,
          },
        },
      }),
    );
  });

  it('does not create a second row for an already-persisted version id', async () => {
    const client = mockClient(buildClientMock([buildRevisionRow()]));

    const { result } = renderHook(() =>
      useDocumentRevisionPersistence({ documentId: DOCUMENT_ID }),
    );

    await result.current.saveVersion({
      versionId: 'version-1',
      createdAt: '2026-09-17T10:00:00.000Z',
      body: '{"v":1}',
    });

    expect(client.mutate).not.toHaveBeenCalled();
  });

  it('deletes only the rows matching the pruned version ids', async () => {
    const client = mockClient(
      buildClientMock([
        buildRevisionRow({ id: 'row-1', versionId: 'version-1' }),
        buildRevisionRow({ id: 'row-2', versionId: 'version-2' }),
      ]),
    );

    const { result } = renderHook(() =>
      useDocumentRevisionPersistence({ documentId: DOCUMENT_ID }),
    );

    await result.current.deleteVersions(['version-2']);

    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(client.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { idToDelete: 'row-2' } }),
    );
  });

  it('does not query when there is nothing to delete', async () => {
    const client = mockClient(buildClientMock([]));

    const { result } = renderHook(() =>
      useDocumentRevisionPersistence({ documentId: DOCUMENT_ID }),
    );

    await result.current.deleteVersions([]);

    expect(client.query).not.toHaveBeenCalled();
    expect(client.mutate).not.toHaveBeenCalled();
  });
});
