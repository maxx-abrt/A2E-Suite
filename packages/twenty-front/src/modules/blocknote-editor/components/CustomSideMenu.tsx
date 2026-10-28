import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { CustomAddBlockItem } from '@/blocknote-editor/components/CustomAddBlockItem';
import { CustomSideMenuOptions } from '@/blocknote-editor/components/CustomSideMenuOptions';
import {
  BlockColorsItem,
  DragHandleButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
  useBlockNoteEditor,
} from '@blocknote/react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { IconColorSwatch, IconPlus, IconTrash } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledDivToCreateGap = styled.div`
  width: ${themeCssVariables.spacing[2]};
`;

const CustomDragHandleMenu = () => {
  const editor: typeof BLOCK_SCHEMA.BlockNoteEditor = useBlockNoteEditor();
  const { t } = useLingui();

  return (
    <DragHandleMenu>
      <CustomAddBlockItem editor={editor}>
        <CustomSideMenuOptions
          LeftIcon={IconPlus}
          text={t`Add Block`}
          Variant="normal"
        />
      </CustomAddBlockItem>
      <BlockColorsItem>
        <CustomSideMenuOptions
          LeftIcon={IconColorSwatch}
          text={t`Change Color`}
          Variant="normal"
        />
      </BlockColorsItem>
      <RemoveBlockItem>
        <CustomSideMenuOptions
          LeftIcon={IconTrash}
          text={t`Delete`}
          Variant="danger"
        />
      </RemoveBlockItem>
    </DragHandleMenu>
  );
};

// BlockNote treats these as component types; inline functions remount the
// popovers whenever focus or document state rerenders the editor.
const CustomSideMenuContent = () => (
  <SideMenu>
    <DragHandleButton dragHandleMenu={CustomDragHandleMenu} />
    <StyledDivToCreateGap />
  </SideMenu>
);

export const CustomSideMenu = () => (
  <SideMenuController sideMenu={CustomSideMenuContent} />
);
