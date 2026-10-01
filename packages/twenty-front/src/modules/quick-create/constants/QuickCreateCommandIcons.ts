import {
  IconCalendarEvent,
  IconCheckbox,
  IconCoins,
  IconFile,
  IconFileText,
  IconLayoutKanban,
  IconUpload,
  type IconComponent,
} from 'twenty-ui/icon';

import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';

// Canonical `twenty-ui/icon` choices for the concepts the entries represent:
// task (IconCheckbox) and kanban project (IconLayoutKanban) come from the icon
// dictionary; page/event/invoice/expense/file have no dictionary concept, so an
// existing icon is used per the dictionary's rule 5.
export const QUICK_CREATE_ICON_BY_COMMAND_ID: Record<
  QuickCreateCommandId,
  IconComponent
> = {
  [QUICK_CREATE_COMMAND_IDS.page]: IconFile,
  [QUICK_CREATE_COMMAND_IDS.task]: IconCheckbox,
  [QUICK_CREATE_COMMAND_IDS.project]: IconLayoutKanban,
  [QUICK_CREATE_COMMAND_IDS.event]: IconCalendarEvent,
  [QUICK_CREATE_COMMAND_IDS.invoice]: IconFileText,
  [QUICK_CREATE_COMMAND_IDS.expense]: IconCoins,
  [QUICK_CREATE_COMMAND_IDS.fileUpload]: IconUpload,
};
