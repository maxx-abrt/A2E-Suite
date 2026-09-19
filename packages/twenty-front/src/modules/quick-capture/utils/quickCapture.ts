import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';

// P10 quick capture targets. Note and task are core CRM objects created
// through the native record-creation primitive; income is deliberately NOT a
// creation target here — it routes to the app's existing pinned quick-entry
// command so the suite keeps a single income path.
export type QuickCaptureTargetId = 'note' | 'task' | 'income';

export const QUICK_CAPTURE_TARGET_IDS: QuickCaptureTargetId[] = [
  'note',
  'task',
  'income',
];

export const DEFAULT_QUICK_CAPTURE_TARGET_ID: QuickCaptureTargetId = 'note';

// The income leg of P7.2's pinned GLOBAL "Bilan : saisie rapide" command is the
// only income entry point. Quick capture reopens the command menu with this
// search so that existing command is surfaced instead of duplicated.
export const QUICK_CAPTURE_INCOME_COMMAND_SEARCH = 'saisie rapide';

type QuickCaptureCreatedObjectName =
  | CoreObjectNameSingular.Note
  | CoreObjectNameSingular.Task;

export type QuickCaptureCreatePlan = {
  objectNameSingular: QuickCaptureCreatedObjectName;
  recordInput: { title: string };
};

export type QuickCaptureNavigationPlan = {
  to: AppPath.RecordShowPage;
  params: {
    objectNameSingular: QuickCaptureCreatedObjectName;
    objectRecordId: string;
  };
};

export const normalizeQuickCaptureText = (rawText: string): string =>
  rawText.trim();

export const isQuickCaptureIncomeTarget = (
  target: QuickCaptureTargetId,
): target is 'income' => target === 'income';

const getQuickCaptureObjectName = (
  target: Exclude<QuickCaptureTargetId, 'income'>,
): QuickCaptureCreatedObjectName =>
  target === 'note' ? CoreObjectNameSingular.Note : CoreObjectNameSingular.Task;

export const buildQuickCaptureCreatePlan = (
  target: QuickCaptureTargetId,
  rawText: string,
): QuickCaptureCreatePlan | null => {
  const title = normalizeQuickCaptureText(rawText);

  if (title.length === 0 || isQuickCaptureIncomeTarget(target)) {
    return null;
  }

  return {
    objectNameSingular: getQuickCaptureObjectName(target),
    recordInput: { title },
  };
};

export const buildQuickCaptureNavigationPlan = (
  target: QuickCaptureTargetId,
  objectRecordId: string,
): QuickCaptureNavigationPlan | null => {
  if (isQuickCaptureIncomeTarget(target) || objectRecordId.length === 0) {
    return null;
  }

  return {
    to: AppPath.RecordShowPage,
    params: {
      objectNameSingular: getQuickCaptureObjectName(target),
      objectRecordId,
    },
  };
};
