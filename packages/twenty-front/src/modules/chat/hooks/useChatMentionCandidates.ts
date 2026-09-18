import { useCallback } from 'react';

import { useMentionSearch } from '@/mention/hooks/useMentionSearch';

export type ChatMentionCandidate = {
  id: string;
  label: string;
  imageUrl: string;
};

const WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR = 'workspaceMember';

// The composer's @autocomplete reuses the shared mention search (same search
// provider documents use) and keeps only workspace members, because the chat
// wire format encodes `@[label](workspaceMemberId)`.
export const useChatMentionCandidates = () => {
  const { searchMentionRecords } = useMentionSearch();

  const searchCandidates = useCallback(
    async (query: string): Promise<ChatMentionCandidate[]> => {
      const results = await searchMentionRecords(query);

      return results
        .filter(
          (result) =>
            result.objectNameSingular === WORKSPACE_MEMBER_OBJECT_NAME_SINGULAR,
        )
        .map((result) => ({
          id: result.recordId,
          label: result.label,
          imageUrl: result.imageUrl,
        }));
    },
    [searchMentionRecords],
  );

  return { searchCandidates };
};
