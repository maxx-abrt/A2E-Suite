import { QuickCreateRecordCommandItem } from '@/quick-create/components/QuickCreateRecordCommandItem';
import { type QuickCreateCommand } from '@/quick-create/hooks/useQuickCreateCommands';
import { CreateChooserModal } from '@/template-gallery/components/CreateChooserModal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { type TemplateDescriptorCategory } from 'twenty-shared/application';

export type QuickCreateRecordCommandWithChooserProps = {
  command: QuickCreateCommand;
  category: TemplateDescriptorCategory;
  // The command's original create action, forwarded to the chooser's Blank.
  onBlank: () => void;
};

// The make-it-or-build-it entry for a create command (PLAN M13a): activating
// the command opens the small chooser instead of creating immediately, and the
// chooser's "Blank" runs the untouched create action passed here. Only the
// document New surface is wired so far; the remaining commands keep the direct
// create until each adopts its own category.
export const QuickCreateRecordCommandWithChooser = ({
  command,
  category,
  onBlank,
}: QuickCreateRecordCommandWithChooserProps) => {
  const modalInstanceId = `quick-create-chooser-${command.id}`;
  const { openModal } = useModal();

  const handleOpenChooser = () => {
    openModal(modalInstanceId);
  };

  return (
    <>
      <QuickCreateRecordCommandItem
        command={command}
        onClick={handleOpenChooser}
      />
      <CreateChooserModal
        modalInstanceId={modalInstanceId}
        category={category}
        onBlank={onBlank}
      />
    </>
  );
};
