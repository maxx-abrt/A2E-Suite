import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';

type QuickCreateRecordCommandItemProps = {
  command: QuickCreateCommand;
  onClick: () => void;
};

// Presentational row shared by the linked and unlinked create commands, so the
// keyboard behaviour (native SelectableListItem + CommandMenuItem) is identical
// whether or not a pre-link follows the creation.
export const QuickCreateRecordCommandItem = ({
  command,
  onClick,
}: QuickCreateRecordCommandItemProps) => (
  <SelectableListItem itemId={command.id} onEnter={onClick}>
    <CommandMenuItem
      id={command.id}
      label={command.label}
      Icon={command.Icon}
      onClick={onClick}
    />
  </SelectableListItem>
);
