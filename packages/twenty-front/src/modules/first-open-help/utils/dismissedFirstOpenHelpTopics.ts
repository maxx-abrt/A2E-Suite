// Dismissals are stored per user so a shared browser never carries one
// member's hidden help into another member's first open.
export type DismissedFirstOpenHelpTopicsByUser = Record<string, string[]>;

export const selectDismissedFirstOpenHelpTopicIds = (
  dismissedByUser: DismissedFirstOpenHelpTopicsByUser,
  userId: string,
): string[] => dismissedByUser[userId] ?? [];

export const dismissFirstOpenHelpTopic = (
  dismissedByUser: DismissedFirstOpenHelpTopicsByUser,
  userId: string,
  topicId: string,
): DismissedFirstOpenHelpTopicsByUser => {
  const dismissedTopicIds = selectDismissedFirstOpenHelpTopicIds(
    dismissedByUser,
    userId,
  );

  if (dismissedTopicIds.includes(topicId)) {
    return dismissedByUser;
  }

  return {
    ...dismissedByUser,
    [userId]: [...dismissedTopicIds, topicId],
  };
};

export const restoreFirstOpenHelpTopic = (
  dismissedByUser: DismissedFirstOpenHelpTopicsByUser,
  userId: string,
  topicId: string,
): DismissedFirstOpenHelpTopicsByUser => {
  const dismissedTopicIds = selectDismissedFirstOpenHelpTopicIds(
    dismissedByUser,
    userId,
  );

  if (!dismissedTopicIds.includes(topicId)) {
    return dismissedByUser;
  }

  return {
    ...dismissedByUser,
    [userId]: dismissedTopicIds.filter(
      (dismissedTopicId) => dismissedTopicId !== topicId,
    ),
  };
};

export const restoreAllFirstOpenHelpTopics = (
  dismissedByUser: DismissedFirstOpenHelpTopicsByUser,
  userId: string,
): DismissedFirstOpenHelpTopicsByUser => {
  if (!(userId in dismissedByUser)) {
    return dismissedByUser;
  }

  const nextDismissedByUser = { ...dismissedByUser };
  delete nextDismissedByUser[userId];

  return nextDismissedByUser;
};
