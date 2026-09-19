import {
  buildHomeSuggestions,
  STALE_TASK_THRESHOLD_MS,
  type HomeSuggestionTask,
} from '@/home-dashboard/utils/buildHomeSuggestions';
import { type InboxNotification } from '@/inbox/types/InboxNotification';

const NOW = new Date('2026-09-19T12:00:00.000Z');

const buildTask = (
  overrides: Partial<HomeSuggestionTask> & { id: string },
): HomeSuggestionTask => ({
  title: 'A task',
  status: 'TODO',
  dueAt: null,
  updatedAt: NOW.toISOString(),
  ...overrides,
});

const buildNotification = (
  overrides: Partial<InboxNotification> & { id: string },
): InboxNotification => ({
  type: 'MENTION',
  payload: null,
  createdAt: NOW.toISOString(),
  readAt: null,
  archivedAt: null,
  ...overrides,
});

describe('buildHomeSuggestions', () => {
  it('returns an empty list when nothing needs attention', () => {
    expect(
      buildHomeSuggestions({ tasks: [], notifications: [], now: NOW }),
    ).toEqual([]);
  });

  describe('stale task threshold boundary', () => {
    it('flags a task untouched for exactly the threshold', () => {
      const atThreshold = buildTask({
        id: 'at-threshold',
        updatedAt: new Date(
          NOW.getTime() - STALE_TASK_THRESHOLD_MS,
        ).toISOString(),
      });

      const suggestions = buildHomeSuggestions({
        tasks: [atThreshold],
        notifications: [],
        now: NOW,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].kind).toBe('STALE_TASK');
      expect(suggestions[0].isOverdue).toBe(false);
    });

    it('leaves a task younger than the threshold alone', () => {
      const justUnderThreshold = buildTask({
        id: 'just-under',
        updatedAt: new Date(
          NOW.getTime() - STALE_TASK_THRESHOLD_MS + 1,
        ).toISOString(),
      });

      expect(
        buildHomeSuggestions({
          tasks: [justUnderThreshold],
          notifications: [],
          now: NOW,
        }),
      ).toEqual([]);
    });
  });

  describe('overdue classification', () => {
    it('maps an incomplete past-due task to an overdue card sorted by due date', () => {
      const suggestions = buildHomeSuggestions({
        tasks: [
          buildTask({ id: 'later', dueAt: '2026-09-18T00:00:00.000Z' }),
          buildTask({ id: 'sooner', dueAt: '2026-09-15T00:00:00.000Z' }),
        ],
        notifications: [],
        now: NOW,
      });

      expect(suggestions.map((suggestion) => suggestion.kind)).toEqual([
        'OVERDUE_TASK',
        'OVERDUE_TASK',
      ]);
      expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
        'OVERDUE_TASK:sooner',
        'OVERDUE_TASK:later',
      ]);
      expect(suggestions[0].isOverdue).toBe(true);
      expect(suggestions[0].deepLink).toBe('/object/task/sooner');
    });

    it('never double-counts an overdue task as stale', () => {
      const suggestions = buildHomeSuggestions({
        tasks: [
          buildTask({
            id: 'overdue-and-old',
            dueAt: '2026-09-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
          }),
        ],
        notifications: [],
        now: NOW,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].kind).toBe('OVERDUE_TASK');
    });

    it('ignores completed and future tasks', () => {
      expect(
        buildHomeSuggestions({
          tasks: [
            buildTask({
              id: 'done',
              status: 'DONE',
              dueAt: '2026-09-01T00:00:00.000Z',
            }),
            buildTask({
              id: 'future',
              dueAt: '2026-09-30T00:00:00.000Z',
            }),
          ],
          notifications: [],
          now: NOW,
        }),
      ).toEqual([]);
    });
  });

  describe('unread mention mapping', () => {
    it('maps an unread mention to a card with its notification deep link', () => {
      const suggestions = buildHomeSuggestions({
        tasks: [],
        notifications: [
          buildNotification({
            id: 'mention-1',
            payload: {
              kind: 'chat.mention',
              channelId: 'channel-1',
              snippet: 'Can you review this?',
            },
          }),
        ],
        now: NOW,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].kind).toBe('UNREAD_MENTION');
      expect(suggestions[0].contextLabel).toBe('Can you review this?');
      expect(suggestions[0].deepLink).toBe('/discussions?channelId=channel-1');
    });

    it('ignores read, archived and non-mention notifications', () => {
      const suggestions = buildHomeSuggestions({
        tasks: [],
        notifications: [
          buildNotification({ id: 'read', readAt: NOW.toISOString() }),
          buildNotification({ id: 'archived', archivedAt: NOW.toISOString() }),
          buildNotification({ id: 'other', type: 'ASSIGNED' }),
        ],
        now: NOW,
      });

      expect(suggestions).toEqual([]);
    });
  });

  it('orders overdue, then stale, then mentions, and honours the limit', () => {
    const suggestions = buildHomeSuggestions({
      tasks: [
        buildTask({ id: 'stale', updatedAt: '2026-08-01T00:00:00.000Z' }),
        buildTask({ id: 'overdue', dueAt: '2026-09-01T00:00:00.000Z' }),
      ],
      notifications: [buildNotification({ id: 'mention' })],
      now: NOW,
      limit: 2,
    });

    expect(suggestions.map((suggestion) => suggestion.kind)).toEqual([
      'OVERDUE_TASK',
      'STALE_TASK',
    ]);
  });
});
