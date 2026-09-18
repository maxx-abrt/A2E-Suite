import {
  buildChatMentionMarkup,
  getChatMentionQueryFromDraft,
  insertChatMentionIntoDraft,
} from '@/chat/utils/chatMentionDraft';

describe('getChatMentionQueryFromDraft', () => {
  it('should return the term after a trailing at-sign', () => {
    expect(getChatMentionQueryFromDraft('hello @mar')).toBe('mar');
  });

  it('should return an empty string right after the at-sign', () => {
    expect(getChatMentionQueryFromDraft('hello @')).toBe('');
  });

  it('should return null when the draft is not mentioning', () => {
    expect(getChatMentionQueryFromDraft('hello team')).toBeNull();
    expect(getChatMentionQueryFromDraft('hello@team')).toBeNull();
  });
});

describe('buildChatMentionMarkup', () => {
  it('should use the same wire format as the a2e-chat message body', () => {
    expect(buildChatMentionMarkup('Marie Dupont', 'member-1')).toBe(
      '@[Marie Dupont](member-1)',
    );
  });
});

describe('insertChatMentionIntoDraft', () => {
  it('should replace the trailing query with the mention markup', () => {
    expect(
      insertChatMentionIntoDraft({
        draft: 'hi @mar',
        label: 'Marie Dupont',
        workspaceMemberId: 'member-1',
      }),
    ).toBe('hi @[Marie Dupont](member-1) ');
  });

  it('should not duplicate the separator when the mention starts the draft', () => {
    expect(
      insertChatMentionIntoDraft({
        draft: '@',
        label: 'Marie Dupont',
        workspaceMemberId: 'member-1',
      }),
    ).toBe('@[Marie Dupont](member-1) ');
  });

  it('should append a mention with a separator when no trailing query exists', () => {
    expect(
      insertChatMentionIntoDraft({
        draft: 'hi',
        label: 'Marie Dupont',
        workspaceMemberId: 'member-1',
      }),
    ).toBe('hi @[Marie Dupont](member-1) ');
  });
});
