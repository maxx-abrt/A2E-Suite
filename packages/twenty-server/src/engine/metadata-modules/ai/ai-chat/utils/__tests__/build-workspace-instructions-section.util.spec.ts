import { buildWorkspaceInstructionsSection } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-workspace-instructions-section.util';

const buildTipTapDocument = (text: string) =>
  JSON.stringify({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  });

describe('buildWorkspaceInstructionsSection', () => {
  it('should return an empty section when no house style is stored', () => {
    expect(buildWorkspaceInstructionsSection('')).toBe('');
  });

  it('should return an empty section for a blank house-style document', () => {
    const blankDocument = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });

    expect(buildWorkspaceInstructionsSection(blankDocument)).toBe('');
  });

  it('should project a stored house-style document to markdown under an admin-attributed header', () => {
    const section = buildWorkspaceInstructionsSection(
      buildTipTapDocument('Toujours répondre en français.'),
    );

    expect(section).toContain('## Workspace Instructions');
    expect(section).toContain(
      'custom instructions provided by the workspace administrator',
    );
    expect(section).toContain('Toujours répondre en français.');
  });

  it('should pass legacy plain-text house style through without a document wrapper', () => {
    const section = buildWorkspaceInstructionsSection(
      'Use **formal** tone and short sentences.',
    );

    expect(section).toContain('## Workspace Instructions');
    expect(section).toContain('Use **formal** tone and short sentences.');
  });
});
