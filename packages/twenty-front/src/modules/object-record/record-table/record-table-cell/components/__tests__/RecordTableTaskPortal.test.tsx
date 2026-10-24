import { RecordTableCellHoveredPortalContent } from '@/object-record/record-table/record-table-cell/components/RecordTableCellHoveredPortalContent';
import { RecordTableCellFocusedPortalContent } from '@/object-record/record-table/record-table-cell/components/RecordTableCellFocusedPortalContent';
import {
  FieldContext,
  type GenericFieldContextType,
} from '@/object-record/record-field/ui/contexts/FieldContext';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { isRecordTableCellsNonEditableComponentState } from '@/object-record/record-table/states/isRecordTableCellsNonEditableComponentState';
import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';

const mockComplete = jest.fn();
const mockOpenRecord = jest.fn();
let mockObjectName = 'task';
jest.mock('@/activities/tasks/hooks/useCompleteTask', () => ({
  useCompleteTask: () => ({
    completeTask: mockComplete,
    canCompleteTask: true,
    isCompleted: false,
  }),
}));
jest.mock('@/object-record/record-field/ui/components/FieldDisplay', () => ({
  FieldDisplay: () => <span>Plan launch</span>,
}));
jest.mock('@/object-record/record-table/contexts/RecordTableContext', () => ({
  useRecordTableContextOrThrow: () => ({
    objectMetadataItem: { nameSingular: mockObjectName },
  }),
}));
jest.mock(
  '@/object-record/record-table/contexts/RecordTableRowContext',
  () => ({
    useRecordTableRowContextOrThrow: () => ({
      recordId: 'task-1',
      rowIndex: 0,
      isRecordReadOnly: false,
    }),
  }),
);
jest.mock(
  '@/object-record/record-table/contexts/RecordTableBodyContext',
  () => ({
    useRecordTableBodyContextOrThrow: () => ({
      onMoveHoverToCurrentCell: jest.fn(),
    }),
  }),
);
jest.mock('@/object-record/record-field/ui/hooks/useIsFieldInputOnly', () => ({
  useIsFieldInputOnly: () => false,
}));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue');
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue',
  () => ({ useAtomComponentFamilyStateValue: () => false }),
);
jest.mock(
  '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue',
  () => ({ useAtomFamilySelectorValue: () => 'Plan launch' }),
);
jest.mock('@/ui/feedback/snack-bar-manager/hooks/useSnackBar', () => ({
  useSnackBar: () => ({ enqueueErrorSnackBar: jest.fn() }),
}));
jest.mock('twenty-ui/utilities', () => ({ useIsMobile: () => false }));
jest.mock(
  '@/object-record/record-table/record-table-cell/components/RecordTableCellDisplayMode',
  () => ({
    RecordTableCellDisplayMode: ({ children }: { children: ReactNode }) => (
      <div onClick={mockOpenRecord}>{children}</div>
    ),
  }),
);
jest.mock(
  '@/object-record/record-table/record-table-cell/components/RecordTableCellEditButton',
  () => ({ RecordTableCellEditButton: () => null }),
);
jest.mock(
  '@/object-record/record-table/record-table-cell/components/RecordTableCellEditMode',
  () => ({ RecordTableCellEditMode: () => null }),
);
jest.mock(
  '@/object-record/record-table/record-table-cell/components/RecordTableCellFieldInput',
  () => ({ RecordTableCellFieldInput: () => null }),
);

const originalPointerEvent = window.PointerEvent;
beforeAll(() =>
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MouseEvent,
  }),
);
afterAll(() =>
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: originalPointerEvent,
  }),
);
beforeEach(() => {
  jest.clearAllMocks();
  mockObjectName = 'task';
  mockComplete.mockResolvedValue(undefined);
  jest
    .mocked(useAtomComponentStateValue)
    .mockImplementation(
      (state) =>
        (state === isRecordTableCellsNonEditableComponentState
          ? false
          : { row: 0, column: 0 }) as never,
    );
  i18n.load('en', {});
  i18n.activate('en');
});

it.each([
  RecordTableCellHoveredPortalContent,
  RecordTableCellFocusedPortalContent,
])(
  'keeps completion available without opening details in %p',
  async (PortalContent) => {
    const user = userEvent.setup();
    render(
      <I18nProvider i18n={i18n}>
        <FieldContext.Provider
          value={
            {
              isLabelIdentifier: true,
              isForbidden: false,
            } as GenericFieldContextType
          }
        >
          <PortalContent />
        </FieldContext.Provider>
      </I18nProvider>,
    );
    await user.click(
      screen.getByRole('checkbox', { name: 'Complete Plan launch' }),
    );
    expect(mockComplete).toHaveBeenCalledWith(true);
    expect(mockOpenRecord).not.toHaveBeenCalled();
    expect(screen.getByText('Plan launch')).toBeInTheDocument();
  },
);

it('preserves ordinary record labels for CRM objects', () => {
  mockObjectName = 'company';
  render(
    <FieldContext.Provider
      value={{ isLabelIdentifier: true } as GenericFieldContextType}
    >
      <RecordTableCellHoveredPortalContent />
    </FieldContext.Provider>,
  );
  expect(screen.getByText('Plan launch')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
