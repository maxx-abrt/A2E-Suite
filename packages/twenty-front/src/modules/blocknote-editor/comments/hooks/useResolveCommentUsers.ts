import { useCallback, useRef } from 'react';
import type { User } from '@blocknote/core/comments';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type WorkspaceMember } from '@/workspace-member/types/WorkspaceMember';

// Users here are workspace members: comment authorship stores the member id,
// the same id the mention path uses, so avatars/names resolve consistently.
export const useResolveCommentUsers = () => {
  const { records: workspaceMembers } = useFindManyRecords<WorkspaceMember>({
    objectNameSingular: CoreObjectNameSingular.WorkspaceMember,
  });

  // Ref keeps the callback identity stable: the comments user store captures
  // resolveUsers once at editor creation and would never see later records.
  // oxlint-disable-next-line twenty/no-state-useref
  const workspaceMembersRef = useRef<WorkspaceMember[]>([]);
  workspaceMembersRef.current = workspaceMembers;

  return useCallback(async (userIds: string[]): Promise<User[]> => {
    return userIds
      .map((userId) =>
        workspaceMembersRef.current.find((member) => member.id === userId),
      )
      .filter(isDefined)
      .map((member) => {
        const fullName = [member.name.firstName, member.name.lastName]
          .filter(isDefined)
          .join(' ')
          .trim();

        return {
          id: member.id,
          username: fullName.length > 0 ? fullName : member.userEmail,
          avatarUrl: member.avatarUrl ?? '',
        };
      });
  }, []);
};
