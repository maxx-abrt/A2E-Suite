import { RecordTableInlineCreateRow } from '@/object-record/record-table/components/RecordTableInlineCreateRow';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@/object-record/record-index/contexts/RecordIndexContext', () => ({
  useRecordIndexContextOrThrow: () => ({
    labelIdentifierFieldMetadataItem: { id: 'title' },
  }),
}));
jest.mock('@/object-record/record-table/contexts/RecordTableContext', () => ({
  useRecordTableContextOrThrow: () => ({
    visibleRecordFields: [{ fieldMetadataItemId: 'title', size: 280 }],
  }),
}));
jest.mock(
  '@/object-record/record-table/hooks/useRecordTableFirstColumnWidthOverride',
  () => ({ useRecordTableFirstColumnWidthOverride: () => undefined }),
);
jest.mock(
  '@/object-record/record-table/record-table-cell/components/RecordTableDragAndDropPlaceholderCell',
  () => ({ RecordTableDragAndDropPlaceholderCell: () => null }),
);
jest.mock(
  '@/object-record/record-table/record-table-row/components/RecordTableAddButtonPlaceholderCell',
  () => ({ RecordTableAddButtonPlaceholderCell: () => null }),
);
jest.mock(
  '@/object-record/record-table/record-table-row/components/RecordTableGroupSectionLastDynamicFillingCell',
  () => ({ RecordTableGroupSectionLastDynamicFillingCell: () => null }),
);

beforeEach(() => {
  i18n.load('en', {});
  i18n.activate('en');
});

it('opens through the keyboard and restores focus to Add task on Escape', async () => {
  const user = userEvent.setup();
  const onCreate = jest.fn().mockResolvedValue({ id: 'task' });
  render(
    <I18nProvider i18n={i18n}>
      <RecordTableInlineCreateRow
        objectNameSingular="task"
        onCreate={onCreate}
      />
    </I18nProvider>,
  );
  await user.tab();
  expect(screen.getByRole('button', { name: 'Add task' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('textbox', { name: 'Add task' })).toHaveFocus();
  await user.type(screen.getByRole('textbox'), 'Draft{Escape}');
  expect(screen.getByRole('button', { name: 'Add task' })).toHaveFocus();
  expect(onCreate).not.toHaveBeenCalled();
});

it('creates projects inline and keeps the composer ready', async () => {
  const user = userEvent.setup();
  const onCreate = jest.fn().mockResolvedValue({ id: 'project' });
  render(
    <I18nProvider i18n={i18n}>
      <RecordTableInlineCreateRow
        objectNameSingular="project"
        onCreate={onCreate}
      />
    </I18nProvider>,
  );
  await user.click(screen.getByRole('button', { name: 'Add project' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Add project' }),
    'Launch{Enter}',
  );
  expect(onCreate).toHaveBeenCalledWith('Launch');
  expect(screen.getByRole('textbox')).toHaveValue('');
  expect(screen.getByRole('textbox')).toHaveFocus();
});
