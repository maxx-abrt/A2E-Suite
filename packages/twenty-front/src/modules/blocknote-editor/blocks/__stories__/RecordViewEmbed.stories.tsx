import { RecordViewEmbedFrameView } from '@/blocknote-editor/blocks/views/RecordViewEmbedFrameView';
import { RecordViewEmbedStub } from '@/blocknote-editor/components/RecordViewEmbedStub';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { styled } from '@linaria/react';
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

type RecordViewEmbedCanvasProps = {
  colorScheme: 'light' | 'dark';
};

// The record-view embed's provider-free surface: the frame chrome plus the one
// safe-degradation stub. The live widget needs the host metadata providers and
// is exercised in the app, not here.
const RecordViewEmbedCanvas = ({ colorScheme }: RecordViewEmbedCanvasProps) => (
  <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
    <StyledCanvas>
      <RecordViewEmbedFrameView title="Tasks">
        <RecordViewEmbedStub variant="denied" objectLabel="Task" />
      </RecordViewEmbedFrameView>
      <RecordViewEmbedFrameView title="Projects">
        <RecordViewEmbedStub variant="unavailable" />
      </RecordViewEmbedFrameView>
    </StyledCanvas>
  </ThemeProvider>
);

const meta: Meta = {
  title: 'Modules/Bureau/Editor Blocks/Record View Embed',
};

export default meta;

type Story = StoryObj;

export const Light: Story = {
  render: () => <RecordViewEmbedCanvas colorScheme="light" />,
};

export const Dark: Story = {
  render: () => <RecordViewEmbedCanvas colorScheme="dark" />,
};
