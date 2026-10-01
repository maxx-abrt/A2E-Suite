import { type BlockOutlineEntry } from '@/blocknote-editor/editor-status/utils/getBlockOutline';
import { TableOfContentsView } from '@/blocknote-editor/blocks/views/TableOfContentsView';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { styled } from '@linaria/react';
import { fn } from 'storybook/test';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme-constants';

const ENTRIES: BlockOutlineEntry[] = [
  { blockId: 'heading-1', level: 1, text: 'Vision' },
  { blockId: 'heading-2', level: 2, text: 'Principles' },
  { blockId: 'heading-3', level: 3, text: 'Calm by default' },
  { blockId: 'heading-4', level: 2, text: 'Roadmap' },
];

const StyledCanvas = styled.div`
  background: ${themeCssVariables.background.primary};
  box-sizing: border-box;
  padding: 32px;
  width: 720px;
`;

type TableOfContentsViewCanvasProps = {
  colorScheme: 'light' | 'dark';
  entries: BlockOutlineEntry[];
};

const TableOfContentsViewCanvas = ({
  colorScheme,
  entries,
}: TableOfContentsViewCanvasProps) => (
  <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
    <StyledCanvas>
      <TableOfContentsView entries={entries} onEntryClick={fn()} />
    </StyledCanvas>
  </ThemeProvider>
);

const meta: Meta = {
  title: 'Modules/Bureau/Editor Blocks/Table Of Contents View',
};

export default meta;

type Story = StoryObj;

export const Light: Story = {
  render: () => (
    <TableOfContentsViewCanvas colorScheme="light" entries={ENTRIES} />
  ),
};

export const Dark: Story = {
  render: () => (
    <TableOfContentsViewCanvas colorScheme="dark" entries={ENTRIES} />
  ),
};

export const Empty: Story = {
  render: () => <TableOfContentsViewCanvas colorScheme="light" entries={[]} />,
};
