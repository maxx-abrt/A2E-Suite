import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { SOURCE_LOCALE } from 'twenty-shared/translations';

import { InboxNotificationItem } from '@/inbox/components/InboxNotificationItem';
import { type InboxNotification } from '@/inbox/types/InboxNotification';
import { messages } from '~/locales/generated/en';

i18n.load({ [SOURCE_LOCALE]: messages });
i18n.activate(SOURCE_LOCALE);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>{children}</I18nProvider>
);

const buildNotification = (
  payload: InboxNotification['payload'],
  type = 'CALENDAR_REMINDER',
): InboxNotification => ({
  id: 'notification-1',
  type,
  payload,
  createdAt: '2026-09-29T09:00:00.000Z',
  readAt: null,
  archivedAt: null,
});

const FULL_PAYLOAD = {
  calendarEventId: 'event-1',
  title: 'Weekly review',
  startsAt: '2026-10-01T09:00:00.000Z',
  reminderMinutes: 15,
};

const renderItem = (
  notification: InboxNotification,
  onOpenNotification: jest.Mock = jest.fn(),
) =>
  render(
    <InboxNotificationItem
      notification={notification}
      isSelected={false}
      onToggleSelection={jest.fn()}
      onOpenNotification={onOpenNotification}
    />,
    { wrapper: Wrapper },
  );

describe('InboxNotificationItem — CALENDAR_REMINDER', () => {
  it('renders the Lingui label and the canonical calendar-event icon', () => {
    const { container } = renderItem(buildNotification(FULL_PAYLOAD));

    expect(screen.getByText('Calendar event reminder')).toBeInTheDocument();
    expect(
      container.querySelector('.tabler-icon-calendar-event'),
    ).not.toBeNull();
  });

  it('maps the event title, startsAt and reminderMinutes into the row text', () => {
    renderItem(buildNotification(FULL_PAYLOAD));

    expect(screen.getByText('Weekly review')).toBeInTheDocument();
    expect(screen.getByText(/Starts/)).toBeInTheDocument();
    expect(screen.getByText('15 min before')).toBeInTheDocument();
  });

  it('renders "at the time of event" for a 0-minute lead', () => {
    renderItem(buildNotification({ ...FULL_PAYLOAD, reminderMinutes: 0 }));

    expect(screen.getByText('At the time of the event')).toBeInTheDocument();
  });

  it('opens the event when the row is actionable', async () => {
    const onOpenNotification = jest.fn();

    renderItem(buildNotification(FULL_PAYLOAD), onOpenNotification);

    await userEvent.click(screen.getByText('Calendar event reminder'));

    expect(onOpenNotification).toHaveBeenCalledTimes(1);
  });

  it('renders a safe, non-actionable row when the event id is missing', async () => {
    const onOpenNotification = jest.fn();

    renderItem(
      buildNotification({ title: 'Weekly review' }),
      onOpenNotification,
    );

    expect(
      screen.getByText('This notification has no destination'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText('Calendar event reminder'));

    expect(onOpenNotification).not.toHaveBeenCalled();
  });

  it('never crashes on a null payload', () => {
    renderItem(buildNotification(null));

    expect(screen.getByText('Calendar event reminder')).toBeInTheDocument();
    expect(
      screen.getByText('This notification has no destination'),
    ).toBeInTheDocument();
  });

  it('omits the start line when startsAt is unparseable', () => {
    renderItem(buildNotification({ ...FULL_PAYLOAD, startsAt: 'not-a-date' }));

    expect(screen.queryByText(/Starts/)).not.toBeInTheDocument();
  });
});
