import { isDefined } from 'twenty-shared/utils';

import { currentUserState } from '@/auth/states/currentUserState';
import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { type InboxRealtimeEvent } from '@/inbox/types/InboxRealtimeEvent';
import { buildInboxTopic } from '@/inbox/utils/buildInboxTopic';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useRealtimeTopic } from '~/modules/realtime/hooks/useRealtimeTopic';

// Live layer of the inbox page. The page query stays the source of truth;
// realtime events are retained and folded on top with the idempotent reducer so
// a reconnect or a race with the query can never duplicate a row. Subscribe
// uses the core user id (not the workspace member id): the gateway ACL compares
// it against the topic's user segment.
export const useInboxLive = ({
  onEvent,
}: {
  onEvent: (event: InboxRealtimeEvent) => void;
}) => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const currentUser = useAtomStateValue(currentUserState);

  const workspaceId = currentWorkspace?.id;
  const userId = currentUser?.id;

  const topic =
    isDefined(workspaceId) && isDefined(userId)
      ? buildInboxTopic({ workspaceId, userId })
      : '';

  useRealtimeTopic<InboxRealtimeEvent>({
    topic,
    enabled: topic.length > 0,
    onEvent,
  });
};
