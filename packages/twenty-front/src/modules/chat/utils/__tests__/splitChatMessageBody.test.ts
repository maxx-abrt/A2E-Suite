import { splitChatMessageBody } from '@/chat/utils/splitChatMessageBody';

describe('splitChatMessageBody', () => {
  it('should return a single text segment when there is no mention', () => {
    expect(splitChatMessageBody('hello team')).toEqual([
      { type: 'text', value: 'hello team' },
    ]);
  });

  it('should split a mention out of surrounding text', () => {
    expect(
      splitChatMessageBody('hi @[Marie Dupont](member-1) can you review?'),
    ).toEqual([
      { type: 'text', value: 'hi ' },
      { type: 'mention', value: 'Marie Dupont', workspaceMemberId: 'member-1' },
      { type: 'text', value: ' can you review?' },
    ]);
  });

  it('should handle adjacent mentions', () => {
    expect(splitChatMessageBody('@[A](member-1)@[B](member-2)')).toEqual([
      { type: 'mention', value: 'A', workspaceMemberId: 'member-1' },
      { type: 'mention', value: 'B', workspaceMemberId: 'member-2' },
    ]);
  });

  it('should ignore a malformed mention marker', () => {
    expect(splitChatMessageBody('@[broken')).toEqual([
      { type: 'text', value: '@[broken' },
    ]);
  });
});
