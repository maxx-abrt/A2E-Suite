import { CoreObjectNameSingular } from 'twenty-shared/types';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

// One workspace-member fetch shared by author labels, mention rendering and
// typing indicators, so the chat page never issues the same query twice.
export const useChatWorkspaceMembers = () => {
  const { records, loading } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.WorkspaceMember,
    recordGqlFields: {
      id: true,
      name: { firstName: true, lastName: true },
      userEmail: true,
    },
  });

  return {
    workspaceMembers: records as unknown as PartialWorkspaceMember[],
    loading,
  };
};
