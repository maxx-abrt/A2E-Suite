import { useCallback } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { useChatWorkspaceMembers } from '@/chat/hooks/useChatWorkspaceMembers';

// Author labels come from workspace members (the same records the mention
// search resolves), so a message author id always renders a human name.
export const useChatAuthorLabels = () => {
  const { workspaceMembers } = useChatWorkspaceMembers();

  return useCallback(
    (authorId: string | null): string => {
      if (authorId === null) {
        return '';
      }

      const author = workspaceMembers.find((member) => member.id === authorId);

      if (!isDefined(author)) {
        return '';
      }

      const fullName = [author.name?.firstName, author.name?.lastName]
        .filter(isNonEmptyString)
        .join(' ');

      return isNonEmptyString(fullName) ? fullName : (author.userEmail ?? '');
    },
    [workspaceMembers],
  );
};
