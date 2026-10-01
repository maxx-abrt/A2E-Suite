import { CommandMenuItem } from '@/command-menu/components/CommandMenuItem';
import { useOpenTemplateGallery } from '@/template-gallery/hooks/useOpenTemplateGallery';
import {
  TEMPLATES_COMMAND_ID,
  useTemplatesCommand,
} from '@/template-gallery/hooks/useTemplatesCommand';
import { SelectableListItem } from '@/ui/layout/selectable-list/components/SelectableListItem';
import { IconFileText } from 'twenty-ui/icon';

// The Cmd+K entry that makes the gallery reachable from everywhere (M9a-4).
// It follows the QuickCapture command pattern: a selectable list item that
// opens the shared side panel page on click or Enter.
export const TemplatesCommand = () => {
  const { templatesCommandLabel } = useTemplatesCommand();
  const { openTemplateGallery } = useOpenTemplateGallery();

  const handleOpenTemplateGallery = () => {
    openTemplateGallery();
  };

  return (
    <SelectableListItem
      itemId={TEMPLATES_COMMAND_ID}
      onEnter={handleOpenTemplateGallery}
    >
      <CommandMenuItem
        id={TEMPLATES_COMMAND_ID}
        label={templatesCommandLabel}
        Icon={IconFileText}
        onClick={handleOpenTemplateGallery}
      />
    </SelectableListItem>
  );
};
