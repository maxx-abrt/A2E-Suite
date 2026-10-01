import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';

// The object each create entry writes through the native `useCreateOneRecord`
// primitive. `financeEntry` carries the expense discriminator; `attachment` is
// the file record a2e-drive extends, written by the existing drive upload path.
export const QUICK_CREATE_OBJECT_NAME_SINGULAR_BY_COMMAND_ID: Record<
  QuickCreateCommandId,
  string
> = {
  [QUICK_CREATE_COMMAND_IDS.page]: 'document',
  [QUICK_CREATE_COMMAND_IDS.task]: 'task',
  [QUICK_CREATE_COMMAND_IDS.project]: 'project',
  [QUICK_CREATE_COMMAND_IDS.event]: 'calendarEvent',
  [QUICK_CREATE_COMMAND_IDS.invoice]: 'invoice',
  [QUICK_CREATE_COMMAND_IDS.expense]: 'financeEntry',
  [QUICK_CREATE_COMMAND_IDS.fileUpload]: 'attachment',
};
