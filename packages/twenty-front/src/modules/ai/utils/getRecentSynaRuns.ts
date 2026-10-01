import { isDefined } from 'twenty-shared/utils';

import { type FlatAgentChatThread } from '@/metadata-store/types/FlatAgentChatThread';

// A "run" the Syna home lists (M7f) is an existing workspace chat thread — the
// persisted usage the assistant already stores (message count, token/credit
// totals) — not a new table. The list is derived from that data so a thread
// created, renamed or archived anywhere is reflected here unchanged, and the
// full thread comes back so the caller can navigate it with the shared
// `useAiChatThreadClick` path.
const DEFAULT_RECENT_RUNS_LIMIT = 3;

const getThreadLastActivityTimestamp = (thread: FlatAgentChatThread): number =>
  new Date(thread.lastMessageAt ?? thread.updatedAt).getTime();

// The most recently active threads, newest first, archived ones excluded. Both
// the sort and the deletion filter mirror the nav drawer's own Recents section:
// `useChatThreads` sorts too, but doing it here keeps the mapper correct for any
// store snapshot instead of relying on the caller's ordering.
export const getRecentSynaRuns = (
  threads: FlatAgentChatThread[],
  limit: number = DEFAULT_RECENT_RUNS_LIMIT,
): FlatAgentChatThread[] =>
  [...threads]
    .filter((thread) => !isDefined(thread.deletedAt))
    .sort(
      (firstThread, secondThread) =>
        getThreadLastActivityTimestamp(secondThread) -
        getThreadLastActivityTimestamp(firstThread),
    )
    .slice(0, Math.max(0, limit));
