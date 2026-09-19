import { useCallback } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { currentUserState } from '@/auth/states/currentUserState';
import { dismissedFirstOpenHelpTopicsState } from '@/first-open-help/states/dismissedFirstOpenHelpTopicsState';
import {
  dismissFirstOpenHelpTopic,
  restoreAllFirstOpenHelpTopics,
  restoreFirstOpenHelpTopic,
  selectDismissedFirstOpenHelpTopicIds,
} from '@/first-open-help/utils/dismissedFirstOpenHelpTopics';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';

export type UseDismissedFirstOpenHelpTopicsResult = {
  dismissedTopicIds: string[];
  dismissTopic: (topicId: string) => void;
  restoreTopic: (topicId: string) => void;
  restoreAllTopics: () => void;
};

export const useDismissedFirstOpenHelpTopics =
  (): UseDismissedFirstOpenHelpTopicsResult => {
    const currentUser = useAtomStateValue(currentUserState);
    const [dismissedFirstOpenHelpTopics, setDismissedFirstOpenHelpTopics] =
      useAtomState(dismissedFirstOpenHelpTopicsState);

    const userId = currentUser?.id ?? null;

    const dismissTopic = useCallback(
      (topicId: string) => {
        if (!isDefined(userId)) {
          return;
        }

        setDismissedFirstOpenHelpTopics((previous) =>
          dismissFirstOpenHelpTopic(previous, userId, topicId),
        );
      },
      [setDismissedFirstOpenHelpTopics, userId],
    );

    const restoreTopic = useCallback(
      (topicId: string) => {
        if (!isDefined(userId)) {
          return;
        }

        setDismissedFirstOpenHelpTopics((previous) =>
          restoreFirstOpenHelpTopic(previous, userId, topicId),
        );
      },
      [setDismissedFirstOpenHelpTopics, userId],
    );

    const restoreAllTopics = useCallback(() => {
      if (!isDefined(userId)) {
        return;
      }

      setDismissedFirstOpenHelpTopics((previous) =>
        restoreAllFirstOpenHelpTopics(previous, userId),
      );
    }, [setDismissedFirstOpenHelpTopics, userId]);

    const dismissedTopicIds = isDefined(userId)
      ? selectDismissedFirstOpenHelpTopicIds(
          dismissedFirstOpenHelpTopics,
          userId,
        )
      : [];

    return { dismissedTopicIds, dismissTopic, restoreTopic, restoreAllTopics };
  };
