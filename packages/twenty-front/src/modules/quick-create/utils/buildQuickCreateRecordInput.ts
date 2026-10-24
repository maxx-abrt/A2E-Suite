import { type ObjectRecord } from '@/object-record/types/ObjectRecord';
import {
  QUICK_CREATE_COMMAND_IDS,
  type QuickCreateCommandId,
} from '@/quick-create/constants/QuickCreateCommandIds';
import { QUICK_CREATE_EVENT_DURATION_MILLISECONDS } from '@/quick-create/constants/QuickCreateEventDurationMilliseconds';
import { QUICK_CREATE_EXPENSE_ENTRY_TYPE } from '@/quick-create/constants/QuickCreateExpenseEntryType';

// `at` is injected so the event input is deterministic under test.
export const buildQuickCreateRecordInput = ({
  commandId,
  at,
  title,
}: {
  commandId: QuickCreateCommandId;
  at: Date;
  title?: string;
}): Partial<ObjectRecord> => {
  switch (commandId) {
    case QUICK_CREATE_COMMAND_IDS.page:
      return { title: '' };
    case QUICK_CREATE_COMMAND_IDS.task:
      return { title: title?.trim() ?? '' };
    case QUICK_CREATE_COMMAND_IDS.project:
      return { name: title?.trim() ?? '' };
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
