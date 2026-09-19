import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { useOpenQuickCaptureSidePanel } from '@/quick-capture/hooks/useOpenQuickCaptureSidePanel';
import {
  QUICK_CAPTURE_COMMAND_ID,
  useQuickCaptureCommand,
} from '@/quick-capture/hooks/useQuickCaptureCommand';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { IconNotes } from 'twenty-ui/icon';

export const QuickCaptureCommand = () => {
  const { quickCaptureCommandLabel } = useQuickCaptureCommand();
  const { openQuickCaptureSidePanel } = useOpenQuickCaptureSidePanel();

  return (
    <SelectableListItem
      itemId={QUICK_CAPTURE_COMMAND_ID}
      onEnter={openQuickCaptureSidePanel}
    >
      <CommandMenuItem
        id={QUICK_CAPTURE_COMMAND_ID}
        label={quickCaptureCommandLabel}
        Icon={IconNotes}
        onClick={openQuickCaptureSidePanel}
      />
    </SelectableListItem>
  );
};
