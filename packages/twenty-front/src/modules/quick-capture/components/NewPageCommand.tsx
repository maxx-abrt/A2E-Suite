import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { useCreateNewPage } from '@/quick-capture/hooks/useCreateNewPage';
import {
  NEW_PAGE_COMMAND_ID,
  useNewPageCommand,
} from '@/quick-capture/hooks/useNewPageCommand';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { IconPlus } from 'twenty-ui/icon';

// The Cmd+K "New page" entry (M8e). It follows the Templates/QuickCapture
// command pattern: a selectable list item that captures straight into an
// untitled document, gated on a2e-documents by `useNewPageCommand`.
export const NewPageCommand = () => {
  const { newPageCommandLabel } = useNewPageCommand();
  const { createNewPage } = useCreateNewPage();

  const handleCreateNewPage = () => {
    void createNewPage();
  };

  return (
    <SelectableListItem
      itemId={NEW_PAGE_COMMAND_ID}
      onEnter={handleCreateNewPage}
    >
      <CommandMenuItem
        id={NEW_PAGE_COMMAND_ID}
        label={newPageCommandLabel}
        Icon={IconPlus}
        onClick={handleCreateNewPage}
      />
    </SelectableListItem>
  );
};
