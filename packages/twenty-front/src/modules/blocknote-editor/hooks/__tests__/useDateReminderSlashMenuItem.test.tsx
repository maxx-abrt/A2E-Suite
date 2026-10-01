import { act, renderHook } from '@testing-library/react';
import { ConnectedAccountProvider } from 'twenty-shared/types';

import { useDateReminderSlashMenuItem } from '@/blocknote-editor/hooks/useDateReminderSlashMenuItem';

const mockCreateCalendarEvent = jest.fn();
const mockEnqueueWarningSnackBar = jest.fn();
const mockInsertInlineContent = jest.fn();

const mockAccounts: { current: unknown[] } = { current: [] };

jest.mock('@/settings/accounts/hooks/useMyConnectedAccounts', () => ({
  useMyConnectedAccounts: () => ({
    accounts: mockAccounts.current,
    loading: false,
  }),
}));

jest.mock('@/activities/calendar/hooks/useCreateCalendarEvent', () => ({
  useCreateCalendarEvent: () => ({
    createCalendarEvent: mockCreateCalendarEvent,
    loading: false,
  }),
}));

jest.mock('@/localization/hooks/useDateTimeFormat', () => ({
  useDateTimeFormat: () => ({
    timeZone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'HH:mm',
    calendarStartDay: 1,
  }),
}));

jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({
    enqueueWarningSnackBar: mockEnqueueWarningSnackBar,
  }),
}));

const eligibleAccount = {
  id: 'account-1',
  handle: 'calendar@acme.dev',
  archivedAt: null,
  provider: ConnectedAccountProvider.GOOGLE,
  connectionParameters: null,
  calendarChannels: [{ isSyncEnabled: true }],
};

const fakeEditor = { insertInlineContent: mockInsertInlineContent } as never;

const runItemClick = async (onItemClick: () => void) => {
  await act(async () => {
    await Promise.resolve(onItemClick());
  });
};

describe('useDateReminderSlashMenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccounts.current = [];
  });

  it('offers a Date/reminder entry in the Bureau group, searchable in fr', () => {
    const { result } = renderHook(() =>
      useDateReminderSlashMenuItem(fakeEditor),
    );

    expect(result.current.title).toBe('Date/reminder');
    expect(result.current.groupKey).toBe('bureau');
    expect(result.current.aliases).toEqual(
      expect.arrayContaining(['rappel', 'échéance']),
    );
    expect(result.current.Icon).toBeDefined();
  });

  it('degrades with a snackbar and inserts nothing when no calendar account exists', async () => {
    const { result } = renderHook(() =>
      useDateReminderSlashMenuItem(fakeEditor),
    );

    await runItemClick(result.current.onItemClick);

    expect(mockEnqueueWarningSnackBar).toHaveBeenCalledTimes(1);
    expect(mockCreateCalendarEvent).not.toHaveBeenCalled();
    expect(mockInsertInlineContent).not.toHaveBeenCalled();
  });

  it('creates the event with the connected account then inserts the date chip', async () => {
    mockAccounts.current = [eligibleAccount];
    mockCreateCalendarEvent.mockResolvedValue({
      success: true,
      calendarEventId: 'event-9',
    });

    const { result } = renderHook(() =>
      useDateReminderSlashMenuItem(fakeEditor),
    );

    await runItemClick(result.current.onItemClick);

    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        connectedAccountId: 'account-1',
        isFullDay: false,
        sendInvitations: false,
      }),
    );
    expect(mockEnqueueWarningSnackBar).not.toHaveBeenCalled();

    const insertedInlineContent = mockInsertInlineContent.mock.calls[0][0];

    expect(insertedInlineContent[0]).toEqual(
      expect.objectContaining({
        type: 'dateReminder',
        props: expect.objectContaining({ calendarEventId: 'event-9' }),
      }),
    );
  });

  it('inserts no broken node when the event creation fails', async () => {
    mockAccounts.current = [eligibleAccount];
    mockCreateCalendarEvent.mockResolvedValue({ success: false });

    const { result } = renderHook(() =>
      useDateReminderSlashMenuItem(fakeEditor),
    );

    await runItemClick(result.current.onItemClick);

    expect(mockCreateCalendarEvent).toHaveBeenCalledTimes(1);
    expect(mockInsertInlineContent).not.toHaveBeenCalled();
  });
});
