import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { HomeSuggestionsWidgetContent } from '@/home-dashboard/components/HomeSuggestionsWidgetContent';
import {
  buildHomeSuggestions,
  type HomeSuggestion,
  type HomeSuggestionTask,
} from '@/home-dashboard/utils/buildHomeSuggestions';
import { HOME_TASK_DONE_STATUS } from '@/home-dashboard/utils/selectMyTasks';
import { useInboxNotifications } from '@/inbox/hooks/useInboxNotifications';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

const HOME_SUGGESTIONS_LIMIT = 8;

// Fetch a wider task page than the card limit so a stale task with a far
// future due date is not filtered out by the due-date ordering.
const HOME_SUGGESTIONS_TASK_FETCH_LIMIT = 50;

export const HomeSuggestionsWidget = () => {
  const navigate = useNavigate();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const workspaceMemberId = currentWorkspaceMember?.id;
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<
    string[]
  >([]);

  const { records } = useFindManyRecords({
    objectNameSingular: CoreObjectNameSingular.Task,
    filter: isDefined(workspaceMemberId)
      ? {
          assigneeId: { eq: workspaceMemberId },
          status: { neq: HOME_TASK_DONE_STATUS },
        }
      : undefined,
    orderBy: [{ dueAt: 'AscNullsLast' }],
    limit: HOME_SUGGESTIONS_TASK_FETCH_LIMIT,
    skip: !isDefined(workspaceMemberId),
    recordGqlFields: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      updatedAt: true,
    },
  });

  const { notifications } = useInboxNotifications();

  const suggestions = buildHomeSuggestions({
    tasks: records as unknown as HomeSuggestionTask[],
    notifications,
    now: new Date(),
    limit: HOME_SUGGESTIONS_LIMIT,
  }).filter((suggestion) => !dismissedSuggestionIds.includes(suggestion.id));

  const handleOpenSuggestion = (suggestion: HomeSuggestion) => {
    if (suggestion.deepLink !== null) {
      navigate(suggestion.deepLink);
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestionIds((currentIds) => [...currentIds, suggestionId]);
  };

  return (
    <HomeSuggestionsWidgetContent
      suggestions={suggestions}
      onOpenSuggestion={handleOpenSuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    />
  );
};
