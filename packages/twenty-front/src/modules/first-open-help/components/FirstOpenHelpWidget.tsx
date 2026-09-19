import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { FirstOpenHelpPanel } from '@/first-open-help/components/FirstOpenHelpPanel';
import {
  FIRST_OPEN_HELP_LAUNCH_ACTIONS,
  type FirstOpenHelpLaunchAction,
} from '@/first-open-help/constants/FirstOpenHelpLaunchActions';
import { FIRST_OPEN_HELP_TOPICS } from '@/first-open-help/constants/FirstOpenHelpTopics';
import { useDismissedFirstOpenHelpTopics } from '@/first-open-help/hooks/useDismissedFirstOpenHelpTopics';
import { resolveFirstOpenHelpContext } from '@/first-open-help/utils/resolveFirstOpenHelpContext';

// A dock widget, never a modal: opening it is the user's choice, and every
// explanation inside can be dismissed without blocking the workspace.
export const FirstOpenHelpWidget = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { dismissedTopicIds, dismissTopic, restoreTopic, restoreAllTopics } =
    useDismissedFirstOpenHelpTopics();

  const context = resolveFirstOpenHelpContext(location.pathname);
  const launchActions = FIRST_OPEN_HELP_LAUNCH_ACTIONS[context];

  const handleSelectLaunchAction = useCallback(
    (launchAction: FirstOpenHelpLaunchAction) => {
      navigate(launchAction.targetPath);
    },
    [navigate],
  );

  return (
    <FirstOpenHelpPanel
      context={context}
      launchActions={launchActions}
      topics={FIRST_OPEN_HELP_TOPICS}
      dismissedTopicIds={dismissedTopicIds}
      onDismissTopic={dismissTopic}
      onRestoreTopic={restoreTopic}
      onRestoreAllTopics={restoreAllTopics}
      onSelectLaunchAction={handleSelectLaunchAction}
    />
  );
};
