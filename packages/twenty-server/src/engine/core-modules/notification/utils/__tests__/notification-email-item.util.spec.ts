import { msg } from '@lingui/core/macro';

import {
  buildNotificationEmailItems,
  extractNotificationEmailPreview,
  getNotificationEmailLabel,
} from 'src/engine/core-modules/notification/utils/notification-email-item.util';

describe('getNotificationEmailLabel', () => {
  it('maps each known notification type to its label', () => {
    expect(getNotificationEmailLabel('MENTION')).toEqual(
      msg`You were mentioned`,
    );
    expect(getNotificationEmailLabel('CHAT_MESSAGE')).toEqual(msg`New message`);
    expect(getNotificationEmailLabel('ASSIGNED')).toEqual(msg`Assigned to you`);
    expect(getNotificationEmailLabel('WATCHED_RECORD_CHANGED')).toEqual(
      msg`A watched record changed`,
    );
    expect(getNotificationEmailLabel('BUDGET_ALERT')).toEqual(
      msg`A budget threshold was reached`,
    );
    expect(getNotificationEmailLabel('INVOICE_OVERDUE')).toEqual(
      msg`An invoice is overdue`,
    );
    expect(getNotificationEmailLabel('PAYMENT_RECEIVED')).toEqual(
      msg`A payment was received`,
    );
    expect(getNotificationEmailLabel('SYSTEM')).toEqual(
      msg`System notification`,
    );
  });

  it('falls back to a generic label for an unknown type', () => {
    expect(getNotificationEmailLabel('SOMETHING_NEW')).toEqual(
      msg`Notification`,
    );
  });
});

describe('extractNotificationEmailPreview', () => {
  it('returns null for a null payload', () => {
    expect(extractNotificationEmailPreview(null)).toBeNull();
  });

  it('falls back through the preview, snippet and title keys', () => {
    expect(extractNotificationEmailPreview({ preview: 'preview' })).toBe(
      'preview',
    );
    expect(extractNotificationEmailPreview({ snippet: 'snippet' })).toBe(
      'snippet',
    );
    expect(extractNotificationEmailPreview({ title: 'title' })).toBe('title');
  });

  it('prefers preview over snippet and ignores non-string or empty values', () => {
    expect(
      extractNotificationEmailPreview({
        preview: 'preview',
        snippet: 'snippet',
      }),
    ).toBe('preview');
    expect(extractNotificationEmailPreview({ snippet: '' })).toBeNull();
    expect(extractNotificationEmailPreview({ snippet: 42 })).toBeNull();
  });
});

describe('buildNotificationEmailItems', () => {
  it('projects each digest item through the injected translator and payload preview', () => {
    const items = buildNotificationEmailItems({
      digestItems: [
        {
          userId: 'user-1',
          type: 'MENTION',
          payload: { snippet: 'Can you review the budget?' },
          createdAt: new Date('2026-09-18T10:01:00.000Z'),
        },
        {
          userId: 'user-1',
          type: 'BUDGET_ALERT',
          payload: {},
          createdAt: new Date('2026-09-18T10:02:00.000Z'),
        },
      ],
      translate: (label) => `translated:${label.message}`,
    });

    expect(items).toEqual([
      {
        title: 'translated:You were mentioned',
        preview: 'Can you review the budget?',
      },
      {
        title: 'translated:A budget threshold was reached',
        preview: null,
      },
    ]);
  });
});
