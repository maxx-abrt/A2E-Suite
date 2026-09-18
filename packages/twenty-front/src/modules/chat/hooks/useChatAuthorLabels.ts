import { useCallback } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';

// Author labels come from workspace members (the same records the mention
// search resolves), so a message author id always renders a human name.
export const useChatAuthorLabels = () => {
  const { records: workspaceMembers } = useFindManyRecords<WorkspaceMember>({
    objectNameSingular: CoreObjectNameSingular.WorkspaceMember,
    recordGqlFields: {
      id: true,
      name: { firstName: true, lastName: true },
      userEmail: true,
    },
  });

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
