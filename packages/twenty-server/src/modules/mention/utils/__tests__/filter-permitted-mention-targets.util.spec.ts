import { type MentionTarget } from 'src/modules/mention/types/mention.type';
import { filterPermittedMentionTargets } from 'src/modules/mention/utils/filter-permitted-mention-targets.util';

const ALICE: MentionTarget = {
  workspaceMemberId: 'member-alice',
  userId: 'user-alice',
};
const BOB: MentionTarget = {
  workspaceMemberId: 'member-bob',
  userId: 'user-bob',
};

describe('filterPermittedMentionTargets', () => {
  it('keeps only targets the access check allows, preserving order', async () => {
    const canTargetRead = jest.fn((target: MentionTarget) =>
      Promise.resolve(target.userId === 'user-bob'),
    );

    await expect(
      filterPermittedMentionTargets({
        targets: [ALICE, BOB],
        canTargetRead,
      }),
    ).resolves.toEqual([BOB]);

    expect(canTargetRead).toHaveBeenCalledTimes(2);
  });

  it('does not call the access check for an empty target list', async () => {
    const canTargetRead = jest.fn();

    await expect(
      filterPermittedMentionTargets({ targets: [], canTargetRead }),
    ).resolves.toEqual([]);
    expect(canTargetRead).not.toHaveBeenCalled();
  });
});
