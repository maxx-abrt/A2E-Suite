import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';
import { QUICK_CREATE_EVENT_DURATION_MILLISECONDS } from '@/quick-create/constants/QuickCreateEventDurationMilliseconds';
import { QUICK_CREATE_EXPENSE_ENTRY_TYPE } from '@/quick-create/constants/QuickCreateExpenseEntryType';

// Minimal input per entry: the create primitive mints the id and lets the
// object's own defaults fill the rest. Creating title/name-empty and opening
// the record lets the user name it in place (the M8e untitled-page pattern).
// `at` is injected so the event input is deterministic under test.
export const buildQuickCreateRecordInput = ({
  commandId,
  at,
}: {
  commandId: QuickCreateCommandId;
  at: Date;
}): Partial<ObjectRecord> => {
  switch (commandId) {
    case QUICK_CREATE_COMMAND_IDS.page:
      return { title: '' };
    case QUICK_CREATE_COMMAND_IDS.task:
      return { title: '' };
    case QUICK_CREATE_COMMAND_IDS.project:
      return { name: '' };
    case QUICK_CREATE_COMMAND_IDS.event:
      return {
        title: '',
        startsAt: at.toISOString(),
        endsAt: new Date(
          at.getTime() + QUICK_CREATE_EVENT_DURATION_MILLISECONDS,
        ).toISOString(),
        isFullDay: false,
        isCanceled: false,
      };
    case QUICK_CREATE_COMMAND_IDS.invoice:
      return {};
    case QUICK_CREATE_COMMAND_IDS.expense:
      return { entryType: QUICK_CREATE_EXPENSE_ENTRY_TYPE };
    case QUICK_CREATE_COMMAND_IDS.fileUpload:
      return {};
  }
};
