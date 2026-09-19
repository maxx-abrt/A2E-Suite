import { AppPath, CoreObjectNameSingular } from 'twenty-shared/types';

import {
  buildQuickCaptureCreatePlan,
  buildQuickCaptureNavigationPlan,
  DEFAULT_QUICK_CAPTURE_TARGET_ID,
  isQuickCaptureIncomeTarget,
  normalizeQuickCaptureText,
  QUICK_CAPTURE_TARGET_IDS,
} from '@/quick-capture/utils/quickCapture';

describe('quickCapture target selection', () => {
  it('offers note, task then income so the creation choices come first', () => {
    expect(QUICK_CAPTURE_TARGET_IDS).toEqual(['note', 'task', 'income']);
  });

  it('defaults to a note capture', () => {
    expect(DEFAULT_QUICK_CAPTURE_TARGET_ID).toBe('note');
  });

  it('flags only the income target as the non-creation leg', () => {
    expect(isQuickCaptureIncomeTarget('income')).toBe(true);
    expect(isQuickCaptureIncomeTarget('note')).toBe(false);
    expect(isQuickCaptureIncomeTarget('task')).toBe(false);
  });
});

describe('normalizeQuickCaptureText', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeQuickCaptureText('  buy milk  ')).toBe('buy milk');
  });
});

describe('buildQuickCaptureCreatePlan', () => {
  it('plans a core note with the captured title', () => {
    expect(buildQuickCaptureCreatePlan('note', 'Meeting idea')).toEqual({
      objectNameSingular: CoreObjectNameSingular.Note,
      recordInput: { title: 'Meeting idea' },
    });
  });

  it('plans a core task with the captured title', () => {
    expect(buildQuickCaptureCreatePlan('task', 'Ship the release')).toEqual({
      objectNameSingular: CoreObjectNameSingular.Task,
      recordInput: { title: 'Ship the release' },
    });
  });

  it('trims the captured title before planning', () => {
    expect(buildQuickCaptureCreatePlan('note', '  padded  ')).toEqual({
      objectNameSingular: CoreObjectNameSingular.Note,
      recordInput: { title: 'padded' },
    });
  });

  it('refuses an empty capture', () => {
    expect(buildQuickCaptureCreatePlan('note', '')).toBeNull();
    expect(buildQuickCaptureCreatePlan('task', '   ')).toBeNull();
  });

  it('never creates a record for the income leg', () => {
    expect(buildQuickCaptureCreatePlan('income', 'Invoice paid')).toBeNull();
  });
});

describe('buildQuickCaptureNavigationPlan', () => {
  it('navigates to the created note record page', () => {
    expect(buildQuickCaptureNavigationPlan('note', 'note-id')).toEqual({
      to: AppPath.RecordShowPage,
      params: {
        objectNameSingular: CoreObjectNameSingular.Note,
        objectRecordId: 'note-id',
      },
    });
  });

  it('navigates to the created task record page', () => {
    expect(buildQuickCaptureNavigationPlan('task', 'task-id')).toEqual({
      to: AppPath.RecordShowPage,
      params: {
        objectNameSingular: CoreObjectNameSingular.Task,
        objectRecordId: 'task-id',
      },
    });
  });

  it('does not navigate for the income leg', () => {
    expect(buildQuickCaptureNavigationPlan('income', 'entry-id')).toBeNull();
  });

  it('does not navigate without a created record id', () => {
    expect(buildQuickCaptureNavigationPlan('note', '')).toBeNull();
  });
});
