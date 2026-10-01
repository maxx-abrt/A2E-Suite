import { type FlatAgentChatThread } from '@/metadata-store/types/FlatAgentChatThread';
import { getRecentSynaRuns } from '@/ai/utils/getRecentSynaRuns';

const buildThread = (
  overrides: Partial<FlatAgentChatThread> & { id: string },
): FlatAgentChatThread =>
  ({
    __typename: 'AgentChatThread',
    conversationSize: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    totalInputCredits: 0,
    totalInputTokens: 0,
    totalOutputCredits: 0,
    totalOutputTokens: 0,
    ...overrides,
  }) as FlatAgentChatThread;

describe('getRecentSynaRuns', () => {
  it('should sort runs by last activity, newest first, falling back to updatedAt', () => {
    const oldestRun = buildThread({
      id: 'oldest',
      lastMessageAt: '2026-01-01T08:00:00.000Z',
    });
    const newestRun = buildThread({
      id: 'newest',
      lastMessageAt: '2026-01-03T08:00:00.000Z',
    });
    const middleRun = buildThread({
      id: 'middle',
      updatedAt: '2026-01-02T08:00:00.000Z',
    });

    const recentRuns = getRecentSynaRuns([oldestRun, newestRun, middleRun]);

    expect(recentRuns.map((thread) => thread.id)).toEqual([
      'newest',
      'middle',
      'oldest',
    ]);
  });

  it('should exclude archived runs', () => {
    const activeRun = buildThread({
      id: 'active',
      lastMessageAt: '2026-01-01T08:00:00.000Z',
    });
    const archivedRun = buildThread({
      id: 'archived',
      lastMessageAt: '2026-01-03T08:00:00.000Z',
      deletedAt: '2026-01-04T08:00:00.000Z',
    });

    const recentRuns = getRecentSynaRuns([activeRun, archivedRun]);

    expect(recentRuns.map((thread) => thread.id)).toEqual(['active']);
  });

  it('should cap the list at three runs by default', () => {
    const threads = Array.from({ length: 5 }, (_unused, index) =>
      buildThread({
        id: `run-${index}`,
        lastMessageAt: `2026-01-0${index + 1}T08:00:00.000Z`,
      }),
    );

    const recentRuns = getRecentSynaRuns(threads);

    expect(recentRuns).toHaveLength(3);
    expect(recentRuns.map((thread) => thread.id)).toEqual([
      'run-4',
      'run-3',
      'run-2',
    ]);
  });

  it('should not mutate the caller-owned thread array while sorting', () => {
    const oldestRun = buildThread({
      id: 'oldest',
      lastMessageAt: '2026-01-01T08:00:00.000Z',
    });
    const newestRun = buildThread({
      id: 'newest',
      lastMessageAt: '2026-01-03T08:00:00.000Z',
    });
    const threads = [oldestRun, newestRun];

    getRecentSynaRuns(threads);

    expect(threads.map((thread) => thread.id)).toEqual(['oldest', 'newest']);
  });
});
