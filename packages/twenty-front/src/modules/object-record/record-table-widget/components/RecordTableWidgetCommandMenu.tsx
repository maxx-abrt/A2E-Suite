import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { RecordIndexCommandMenuDropdown } from '@/command-menu-item/components/RecordIndexCommandMenuDropdown';
import { CommandMenuContextProvider } from '@/command-menu-item/contexts/CommandMenuContextProvider';
import { CommandMenuItemContainerType } from '@/command-menu-item/types/CommandMenuItemContainerType';
import { getCommandMenuIdFromRecordIndexId } from '@/command-menu-item/utils/getCommandMenuIdFromRecordIndexId';
import { RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect } from '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect';
import { RecordIndexFiltersToContextStoreEffect } from '@/object-record/record-index/components/RecordIndexFiltersToContextStoreEffect';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { type ReactNode } from 'react';

type RecordTableWidgetCommandMenuProps = { children: ReactNode };

export const RecordTableWidgetCommandMenu = ({
  children,
}: RecordTableWidgetCommandMenuProps) => {
  const { recordIndexId } = useRecordIndexContextOrThrow();

  return (
    <CommandMenuComponentInstanceContext.Provider
      value={{ instanceId: getCommandMenuIdFromRecordIndexId(recordIndexId) }}
    >
      <RecordIndexFiltersToContextStoreEffect />
      <RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect />
      <CommandMenuContextProvider
        displayType="dropdownItem"
        containerType={CommandMenuItemContainerType.IndexPageDropdown}
      >
        <RecordIndexCommandMenuDropdown />
      </CommandMenuContextProvider>
      {children}
    </CommandMenuComponentInstanceContext.Provider>
  );
};
