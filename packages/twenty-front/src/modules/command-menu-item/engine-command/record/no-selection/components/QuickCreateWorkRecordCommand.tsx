import { useUnmountCommand } from '@/command-menu-item/engine-command/hooks/useUnmountEngineCommand';
import { CommandComponentInstanceContext } from '@/command-menu-item/engine-command/states/contexts/CommandComponentInstanceContext';
import { RecordQuickCreateModal } from '@/object-record/record-create/components/RecordQuickCreateModal';
import { useAvailableComponentInstanceIdOrThrow } from '@/ui/utilities/state/component-state/hooks/useAvailableComponentInstanceIdOrThrow';

type QuickCreateWorkRecordCommandProps = {
  objectNameSingular: string;
  onCreate: (title: string) => Promise<unknown>;
};

export const QuickCreateWorkRecordCommand = ({
  objectNameSingular,
  onCreate,
}: QuickCreateWorkRecordCommandProps) => {
  const commandId = useAvailableComponentInstanceIdOrThrow(
    CommandComponentInstanceContext,
  );
  const unmountCommand = useUnmountCommand();
  return (
    <RecordQuickCreateModal
      modalId={`${commandId}-quick-create`}
      objectNameSingular={objectNameSingular}
      onCreate={onCreate}
      onClose={() => unmountCommand(commandId)}
    />
  );
};
