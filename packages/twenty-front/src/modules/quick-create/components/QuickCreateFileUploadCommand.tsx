import { QuickCreateRecordCommandItem } from '@/quick-create/components/QuickCreateRecordCommandItem';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { useQuickCreateFileUpload } from '@/quick-create/hooks/useQuickCreateFileUpload';
import { useCallback } from 'react';

type QuickCreateFileUploadCommandProps = {
  command: QuickCreateCommand;
};

export const QuickCreateFileUploadCommand = ({
  command,
}: QuickCreateFileUploadCommandProps) => {
  const { openQuickCreateFileUpload } = useQuickCreateFileUpload();

  const handleClick = useCallback(() => {
    openQuickCreateFileUpload();
  }, [openQuickCreateFileUpload]);

  return (
    <QuickCreateRecordCommandItem command={command} onClick={handleClick} />
  );
};
