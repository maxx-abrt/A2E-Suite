import { RecordQuickCreateModal } from '@/object-record/record-create/components/RecordQuickCreateModal';
import { QuickCreateRecordCommandItem } from '@/quick-create/components/QuickCreateRecordCommandItem';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useState } from 'react';

type QuickCreateWorkRecordCommandItemProps = {
  command: QuickCreateCommand;
  onCreate: (title: string) => Promise<void>;
};

export const QuickCreateWorkRecordCommandItem = ({
  command,
  onCreate,
}: QuickCreateWorkRecordCommandItemProps) => {
  const [isOpened, setIsOpened] = useState(false);
  const { closeSidePanelMenu } = useSidePanelMenu();

  return (
    <>
      <QuickCreateRecordCommandItem
        command={command}
        onClick={() => setIsOpened(true)}
      />
      {isOpened && (
        <RecordQuickCreateModal
          modalId={`quick-create-work-${command.id}`}
          objectNameSingular={command.objectNameSingular}
          onCreate={async (title) => {
            await onCreate(title);
            closeSidePanelMenu();
          }}
          onClose={() => setIsOpened(false)}
        />
      )}
    </>
  );
};
