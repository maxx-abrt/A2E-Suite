import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { isSoloWorkspace } from '@/workspace-member/utils/isSoloWorkspace';

const createMember = (id: string) => ({ id }) as PartialWorkspaceMember;

describe('isSoloWorkspace', () => {
  it('treats a workspace with exactly one member as solo', () => {
    expect(isSoloWorkspace([createMember('member-1')])).toBe(true);
  });

  it('treats a workspace with several members as a team workspace', () => {
    expect(
      isSoloWorkspace([createMember('member-1'), createMember('member-2')]),
    ).toBe(false);
  });

  it('does not treat an unloaded member list as solo', () => {
    expect(isSoloWorkspace([])).toBe(false);
  });
});
