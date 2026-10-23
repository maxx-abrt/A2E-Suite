import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { RecordTableWidgetCommandMenu } from '@/object-record/record-table-widget/components/RecordTableWidgetCommandMenu';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';

jest.mock('@/object-record/record-index/contexts/RecordIndexContext');
jest.mock(
  '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect',
  () => ({
    RecordIndexFiltersToContextStoreEffect: () => null,
  }),
);
jest.mock(
  '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect',
  () => ({
    RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect: () => null,
  }),
);
jest.mock('@/command-menu-item/contexts/CommandMenuContextProvider', () => ({
  CommandMenuContextProvider: ({ children }: { children: ReactNode }) =>
    children,
}));
jest.mock(
  '@/command-menu-item/components/RecordIndexCommandMenuDropdown',
  () => ({
    RecordIndexCommandMenuDropdown: () => null,
  }),
);

const NativeRow = () => {
  const instanceId = useAvailableComponentInstanceIdOrThrow(
    CommandMenuComponentInstanceContext,
  );
  return <output>{instanceId}</output>;
};

it('provides row actions with an isolated menu when rendered without an outer record page', () => {
  jest.mocked(useRecordIndexContextOrThrow).mockReturnValue({
    recordIndexId: 'tasks-view-bureau',
  } as ReturnType<typeof useRecordIndexContextOrThrow>);
  render(
    <RecordTableWidgetCommandMenu>
      <NativeRow />
    </RecordTableWidgetCommandMenu>,
  );
  expect(
    screen.getByText('command-menu-record-index-tasks-view-bureau'),
  ).toBeInTheDocument();
});

it('keeps embedded row actions separate from the surrounding record page', () => {
  jest.mocked(useRecordIndexContextOrThrow).mockReturnValue({
    recordIndexId: 'tasks-view-project-widget',
  } as ReturnType<typeof useRecordIndexContextOrThrow>);
  render(
    <CommandMenuComponentInstanceContext.Provider
      value={{ instanceId: 'outer-project-menu' }}
    >
      <RecordTableWidgetCommandMenu>
        <NativeRow />
      </RecordTableWidgetCommandMenu>
      <NativeRow />
    </CommandMenuComponentInstanceContext.Provider>,
  );
  expect(
    screen.getByText('command-menu-record-index-tasks-view-project-widget'),
  ).toBeInTheDocument();
  expect(screen.getByText('outer-project-menu')).toBeInTheDocument();
});
