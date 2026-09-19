import {
  dismissFirstOpenHelpTopic,
  restoreAllFirstOpenHelpTopics,
  restoreFirstOpenHelpTopic,
  selectDismissedFirstOpenHelpTopicIds,
} from '@/first-open-help/utils/dismissedFirstOpenHelpTopics';

describe('dismissedFirstOpenHelpTopics', () => {
  it('dismisses a topic once and keeps inserts idempotent', () => {
    const first = dismissFirstOpenHelpTopic({}, 'user-1', 'topic-a');
    const second = dismissFirstOpenHelpTopic(first, 'user-1', 'topic-a');

    expect(selectDismissedFirstOpenHelpTopicIds(second, 'user-1')).toEqual([
      'topic-a',
    ]);
    expect(second).toBe(first);
  });

  it('keeps dismissals isolated per user', () => {
    const dismissed = dismissFirstOpenHelpTopic({}, 'user-1', 'topic-a');
    const withOtherUser = dismissFirstOpenHelpTopic(
      dismissed,
      'user-2',
      'topic-b',
    );

    expect(
      selectDismissedFirstOpenHelpTopicIds(withOtherUser, 'user-1'),
    ).toEqual(['topic-a']);
    expect(
      selectDismissedFirstOpenHelpTopicIds(withOtherUser, 'user-2'),
    ).toEqual(['topic-b']);
    expect(
      selectDismissedFirstOpenHelpTopicIds(withOtherUser, 'user-3'),
    ).toEqual([]);
  });

  it('restores a single topic and ignores an unknown one', () => {
    const dismissed = dismissFirstOpenHelpTopic({}, 'user-1', 'topic-a');
    const restored = restoreFirstOpenHelpTopic(dismissed, 'user-1', 'topic-a');
    const untouched = restoreFirstOpenHelpTopic(dismissed, 'user-1', 'topic-b');

    expect(selectDismissedFirstOpenHelpTopicIds(restored, 'user-1')).toEqual(
      [],
    );
    expect(untouched).toBe(dismissed);
  });

  it('restores every dismissed topic for the user only', () => {
    const dismissed = dismissFirstOpenHelpTopic(
      dismissFirstOpenHelpTopic({}, 'user-1', 'topic-a'),
      'user-2',
      'topic-b',
    );
    const restored = restoreAllFirstOpenHelpTopics(dismissed, 'user-1');

    expect(selectDismissedFirstOpenHelpTopicIds(restored, 'user-1')).toEqual(
      [],
    );
    expect(selectDismissedFirstOpenHelpTopicIds(restored, 'user-2')).toEqual([
      'topic-b',
    ]);
    expect(restoreAllFirstOpenHelpTopics({}, 'user-1')).toEqual({});
  });
});
