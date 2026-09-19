import {
  canUndoDriveBulkArchive,
  runDriveBulkAction,
} from '@/drive/utils/driveBulkOperations';

describe('runDriveBulkAction', () => {
  it('runs every item and reports the successes when none fail', async () => {
    const executed: string[] = [];

    const result = await runDriveBulkAction({
      items: [
        { id: 'a', label: 'a.txt' },
        { id: 'b', label: 'b.txt' },
      ],
      action: async (item) => {
        executed.push(item.id);
      },
    });

    expect(executed).toEqual(['a', 'b']);
    expect(result.total).toBe(2);
    expect(result.succeededIds).toEqual(['a', 'b']);
    expect(result.failures).toEqual([]);
  });

  it('never aborts the batch and reports each failure per item', async () => {
    const result = await runDriveBulkAction({
      items: [
        { id: 'a', label: 'a.txt' },
        { id: 'b', label: 'b.txt' },
        { id: 'c', label: 'c.txt' },
      ],
      action: (item) => {
        if (item.id === 'b') {
          throw new Error('network down');
        }
      },
    });

    expect(result.succeededIds).toEqual(['a', 'c']);
    expect(result.failures).toEqual([
      { id: 'b', label: 'b.txt', reason: 'unknown', detail: 'network down' },
    ]);
  });

  it('records an expected failure reason returned by the action', async () => {
    const result = await runDriveBulkAction({
      items: [{ id: 'a', label: 'a.txt' }],
      action: () => 'download-url-missing',
    });

    expect(result.succeededIds).toEqual([]);
    expect(result.failures).toEqual([
      { id: 'a', label: 'a.txt', reason: 'download-url-missing' },
    ]);
  });

  it('omits detail when a thrown value carries no message', async () => {
    const result = await runDriveBulkAction({
      items: [{ id: 'a', label: 'a.txt' }],
      action: () => {
        throw new Error('');
      },
    });

    expect(result.failures).toEqual([
      { id: 'a', label: 'a.txt', reason: 'unknown' },
    ]);
  });

  it('handles an empty batch', async () => {
    const result = await runDriveBulkAction({
      items: [],
      action: jest.fn(),
    });

    expect(result).toEqual({ total: 0, succeededIds: [], failures: [] });
  });
});

describe('canUndoDriveBulkArchive', () => {
  const NOW = Date.parse('2026-09-17T12:00:00.000Z');

  it('allows undo inside the retention window', () => {
    expect(
      canUndoDriveBulkArchive(
        {
          items: [{ id: 'a', label: 'a.txt' }],
          archivedAt: new Date(NOW - 60_000).toISOString(),
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('withdraws undo past the retention window', () => {
    expect(
      canUndoDriveBulkArchive(
        {
          items: [{ id: 'a', label: 'a.txt' }],
          archivedAt: new Date(NOW - 8 * 24 * 60 * 60 * 1000).toISOString(),
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('withdraws undo without a pending archive', () => {
    expect(canUndoDriveBulkArchive(null, NOW)).toBe(false);
  });
});
