import { BookmarkCardView } from '@/blocknote-editor/blocks/views/BookmarkCardView';
import { FileEmbedView } from '@/blocknote-editor/blocks/views/FileEmbedView';
import { PageLinkView } from '@/blocknote-editor/blocks/views/PageLinkView';
import { TodoTaskView } from '@/blocknote-editor/blocks/views/TodoTaskView';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { styled } from '@linaria/react';
import { fn } from 'storybook/test';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, themeCssVariables } from 'twenty-ui/theme-constants';

const StyledCanvas = styled.div`
  background: ${themeCssVariables.background.primary};
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[4]};
  padding: 32px;
  width: 720px;
`;

const StyledSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLabel = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  text-transform: uppercase;
`;

type CustomBlockViewsCanvasProps = {
  colorScheme: 'light' | 'dark';
};

// Provider-free views of the M8a interactive blocks: each block's pure render,
// not the editor-wired component that owns the mutation providers.
const CustomBlockViewsCanvas = ({
  colorScheme,
}: CustomBlockViewsCanvasProps) => (
  <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
    <MemoryRouter>
      <StyledCanvas>
        <StyledSection>
          <StyledLabel>Todo / task chip</StyledLabel>
          <TodoTaskView
            checked={false}
            title="Send the Q3 report"
            taskId=""
            onToggleChecked={fn()}
            onConvertToTask={fn()}
          />
          <TodoTaskView
            checked={true}
            title="Send the Q3 report"
            taskId="task-1"
            onToggleChecked={fn()}
          />
        </StyledSection>
        <StyledSection>
          <StyledLabel>Media embed</StyledLabel>
          <FileEmbedView
            url="https://via.placeholder.com/480x220"
            name="diagram.png"
            fileCategory="IMAGE"
          />
          <FileEmbedView
            url="https://example.com/contract.pdf"
            name="contract.pdf"
            fileCategory="TEXT_DOCUMENT"
          />
        </StyledSection>
        <StyledSection>
          <StyledLabel>Web bookmark</StyledLabel>
          <BookmarkCardView
            url="https://www.notion.so/guide"
            title="The calm workspace guide"
            hostname="notion.so"
          />
        </StyledSection>
        <StyledSection>
          <StyledLabel>Page link</StyledLabel>
          <PageLinkView documentId="document-1" title="Meeting notes" />
        </StyledSection>
      </StyledCanvas>
    </MemoryRouter>
  </ThemeProvider>
);

const meta: Meta = {
  title: 'Modules/Bureau/Editor Blocks/Custom Block Views',
};

export default meta;

type Story = StoryObj;

export const Light: Story = {
  render: () => <CustomBlockViewsCanvas colorScheme="light" />,
};

export const Dark: Story = {
  render: () => <CustomBlockViewsCanvas colorScheme="dark" />,
};
