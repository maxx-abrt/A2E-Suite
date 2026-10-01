import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { useCallback } from 'react';
import { Temporal } from 'temporal-polyfill';
import { isDefined } from 'twenty-shared/utils';
import { IconCalendarEvent } from 'twenty-ui/icon';

import { useCreateCalendarEvent } from '@/activities/calendar/hooks/useCreateCalendarEvent';
import { isCalendarCreationEnabledForAccount } from '@/activities/calendar/utils/isCalendarCreationEnabledForAccount';
import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { type SuggestionItem } from '@/blocknote-editor/types/types';
import { buildDateReminderMention } from '@/blocknote-editor/utils/buildDateReminderMention';
import { SLASH_MENU_GROUP_LABELS } from '@/blocknote-editor/utils/slashMenuGroups';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { useMyConnectedAccounts } from '@/settings/accounts/hooks/useMyConnectedAccounts';
import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';

type BlockEditorInstance = typeof BLOCK_SCHEMA.BlockNoteEditor;

// The `/date-reminder` slash entry creates a real Agenda `calendarEvent` through
// the calendar composer primitive (so a connected calendar account is required)
// and inserts a `dateReminder` chip pointing at it. With no calendar account it
// degrades with a snackbar and inserts nothing — never a broken inline node.
export const useDateReminderSlashMenuItem = (
  editor: BlockEditorInstance,
): SuggestionItem => {
  const { accounts } = useMyConnectedAccounts();
  const { createCalendarEvent } = useCreateCalendarEvent();
  const { timeZone } = useDateTimeFormat();
  const { enqueueWarningSnackBar } = useSnackBar();

  const onItemClick = useCallback(async () => {
    const calendarAccount = accounts.find(isCalendarCreationEnabledForAccount);

    if (!isDefined(calendarAccount)) {
      enqueueWarningSnackBar({
        message: i18n._(
          msg`Connect a calendar account to add an Agenda reminder.`,
        ),
      });

      return;
    }

    const { calendarEventInput, mention } = buildDateReminderMention({
      now: Temporal.Now.instant(),
      timeZone,
      locale: i18n.locale,
    });

    const { success, calendarEventId } = await createCalendarEvent({
      connectedAccountId: calendarAccount.id,
      ...calendarEventInput,
    });

    if (!success || !isDefined(calendarEventId)) {
      // createCalendarEvent already surfaced the failure; inserting a chip with
      // no backing event would be a broken node.
      return;
    }

    editor.insertInlineContent([
      {
        type: 'dateReminder',
        props: { calendarEventId, ...mention },
      },
      ' ',
    ]);
  }, [accounts, createCalendarEvent, editor, enqueueWarningSnackBar, timeZone]);

  return {
    title: i18n._(msg`Date/reminder`),
    aliases: ['date', 'rappel', 'reminder', 'échéance', 'agenda'],
    group: i18n._(SLASH_MENU_GROUP_LABELS.bureau),
    groupKey: 'bureau',
    Icon: IconCalendarEvent,
    onItemClick,
  };
};
