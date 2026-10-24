import { QUICK_CREATE_COMMAND_IDS } from '@/quick-create/constants/QuickCreateCommandIds';
import { buildQuickCreateRecordInput } from '@/quick-create/utils/buildQuickCreateRecordInput';

const at = new Date('2026-10-01T09:00:00.000Z');

describe('buildQuickCreateRecordInput', () => {
  it.each([
    [QUICK_CREATE_COMMAND_IDS.task, { title: 'Ship the report' }],
    [QUICK_CREATE_COMMAND_IDS.project, { name: 'Ship the report' }],
  ])('uses the captured title for %s', (commandId, expectedInput) => {
    expect(
      buildQuickCreateRecordInput({
        commandId,
        at,
        title: '  Ship the report  ',
      }),
    ).toEqual(expectedInput);
  });
  it('creates an untitled page through the document primitive', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.page,
        at,
      }),
    ).toEqual({ title: '' });
  });

  it('creates an untitled task', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.task,
        at,
      }),
    ).toEqual({ title: '' });
  });

  it('creates a project with its object defaults', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.project,
        at,
      }),
    ).toEqual({ name: '' });
  });

  it('creates a one-hour local calendar event', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.event,
        at,
      }),
    ).toEqual({
      title: '',
      startsAt: '2026-10-01T09:00:00.000Z',
      endsAt: '2026-10-01T10:00:00.000Z',
      isFullDay: false,
      isCanceled: false,
    });
  });

  it('creates an invoice through the accounting object defaults', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.invoice,
        at,
      }),
    ).toEqual({});
  });

  it('creates a finance entry pinned to the expense side', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.expense,
        at,
      }),
    ).toEqual({ entryType: 'EXPENSE' });
  });

  it('has no record input for the file-upload entry (the picker owns it)', () => {
    expect(
      buildQuickCreateRecordInput({
        commandId: QUICK_CREATE_COMMAND_IDS.fileUpload,
        at,
      }),
    ).toEqual({});
  });
});
