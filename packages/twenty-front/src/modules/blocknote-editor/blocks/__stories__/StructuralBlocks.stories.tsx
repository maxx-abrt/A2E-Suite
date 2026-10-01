import { BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import '@blocknote/mantine/style.css';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/react/style.css';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { styled } from '@linaria/react';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCanvas = styled.div`
  background: ${themeCssVariables.background.primary};
  box-sizing: border-box;
  padding: 32px;
  width: 720px;
`;

type StructuralBlocksCanvasProps = {
  colorScheme: 'light' | 'dark';
};

// Renders the M8a structural set straight from BlockNote, with no Twenty app
// provider tree — the editor is the only context these blocks need.
const StructuralBlocksCanvas = ({
  colorScheme,
}: StructuralBlocksCanvasProps) => {
  const editor = useCreateBlockNote({
    schema: BLOCK_SCHEMA,
    initialContent: [
      {
        type: 'heading',
        props: { level: 2 },
        content: 'Bureau block set',
      },
      {
        type: 'paragraph',
        content: 'A provider-free preview of the M8a structural blocks.',
      },
      { type: 'tableOfContents' },
      {
        type: 'heading',
        props: { level: 3, isToggleable: true },
        content: 'Toggle heading',
        children: [{ type: 'paragraph', content: 'Revealed body' }],
      },
      {
        type: 'toggleListItem',
        content: 'Toggle list item',
        children: [{ type: 'paragraph', content: 'Nested detail' }],
      },
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            children: [{ type: 'paragraph', content: 'Column one' }],
          },
          {
            type: 'column',
            children: [{ type: 'paragraph', content: 'Column two' }],
          },
        ],
      },
      { type: 'quote', content: 'Knowledge compounds.' },
      {
        type: 'codeBlock',
        props: { language: 'typescript' },
        content: 'const blockCount = 8;',
      },
      { type: 'divider' },
      {
        type: 'table',
        content: {
          type: 'tableContent',
          columnWidths: [200, 200],
          headerRows: 1,
          rows: [
            { cells: ['Block', 'Status'] },
            { cells: ['Toggle list', 'Shipped'] },
            { cells: ['Table of contents', 'Shipped'] },
          ],
        },
      },
    ],
  });

  return (
    <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
      <StyledCanvas>
        <BlockNoteView
          editor={editor}
          theme={colorScheme}
          editable={false}
          slashMenu={false}
          sideMenu={false}
          formattingToolbar={false}
          portalElements={{ default: null }}
        />
      </StyledCanvas>
    </ThemeProvider>
  );
};

const meta: Meta = {
  title: 'Modules/Bureau/Editor Blocks/Structural Blocks',
};

export default meta;

type Story = StoryObj;

export const Light: Story = {
  render: () => <StructuralBlocksCanvas colorScheme="light" />,
};

export const Dark: Story = {
  render: () => <StructuralBlocksCanvas colorScheme="dark" />,
};
