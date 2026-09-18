import { subtractMentionedWorkspaceMemberIds } from 'src/modules/mention/utils/subtract-mentioned-workspace-member-ids.util';

describe('subtractMentionedWorkspaceMemberIds', () => {
  it('keeps only ids that were not mentioned in the previous revision', () => {
    expect(
      subtractMentionedWorkspaceMemberIds({
        mentionedWorkspaceMemberIds: ['alice', 'bob'],
        alreadyMentionedWorkspaceMemberIds: ['alice'],
      }),
    ).toEqual(['bob']);
  });

  it('returns the same list when nothing was mentioned before', () => {
    expect(
      subtractMentionedWorkspaceMemberIds({
        mentionedWorkspaceMemberIds: ['alice'],
        alreadyMentionedWorkspaceMemberIds: [],
      }),
    ).toEqual(['alice']);
  });
});
