import { type ChatChannel } from '@/chat/types/ChatChannel';
import { groupChatChannelsBySection } from '@/chat/utils/groupChatChannelsBySection';

const buildChannel = (
  overrides: Partial<ChatChannel> & Pick<ChatChannel, 'id' | 'name' | 'kind'>,
): ChatChannel => ({
  visibility: 'PUBLIC',
  topic: null,
  ...overrides,
});

describe('groupChatChannelsBySection', () => {
  it('should order sections workspace, project then custom', () => {
    const sections = groupChatChannelsBySection([
      buildChannel({ id: 'c', name: 'Custom', kind: 'CUSTOM' }),
      buildChannel({ id: 'p', name: 'Project', kind: 'PROJECT' }),
      buildChannel({ id: 'w', name: 'Workspace', kind: 'WORKSPACE' }),
    ]);

    expect(sections.map((section) => section.kind)).toEqual([
      'WORKSPACE',
      'PROJECT',
      'CUSTOM',
    ]);
  });

  it('should drop empty sections', () => {
    const sections = groupChatChannelsBySection([
      buildChannel({ id: 'w', name: 'General', kind: 'WORKSPACE' }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0].kind).toBe('WORKSPACE');
  });

  it('should sort channels by name within a section', () => {
    const sections = groupChatChannelsBySection([
      buildChannel({ id: 'b', name: 'Bravo', kind: 'WORKSPACE' }),
      buildChannel({ id: 'a', name: 'alpha', kind: 'WORKSPACE' }),
      buildChannel({ id: 'c', name: 'Charlie', kind: 'WORKSPACE' }),
    ]);

    expect(sections[0].channels.map((channel) => channel.name)).toEqual([
      'alpha',
      'Bravo',
      'Charlie',
    ]);
  });

  it('should return no sections for no channels', () => {
    expect(groupChatChannelsBySection([])).toEqual([]);
  });
});
