import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { WorkspaceMemberAvatarStack } from '@/workspace-member/components/WorkspaceMemberAvatarStack';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useId } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { AppTooltip, TooltipDelay, TooltipPosition } from 'twenty-ui/surfaces';

const StyledPresenceStack = styled.div`
  align-items: center;
  display: flex;
  position: relative;
`;

const StyledOnlineDot = styled.span`
  background: ${themeCssVariables.color.green};
  border: 2px solid ${themeCssVariables.background.secondary};
  border-radius: 50%;
  bottom: -1px;
  height: 6px;
  pointer-events: none;
  position: absolute;
  right: -1px;
  width: 6px;
`;

const getDisplayName = (workspaceMember: PartialWorkspaceMember) => {
  const fullName = [
    workspaceMember.name?.firstName,
    workspaceMember.name?.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || workspaceMember.userEmail;
};

export const RealtimePresenceAvatarStack = ({
  workspaceMembers,
}: {
  workspaceMembers: PartialWorkspaceMember[];
}) => {
  const { t } = useLingui();
  const tooltipId = `presence-avatar-stack-${useId().replaceAll(':', '')}`;

  if (workspaceMembers.length === 0) {
    return null;
  }

  const memberNames = workspaceMembers.map(getDisplayName).join(', ');

  return (
    <StyledPresenceStack
      id={tooltipId}
      data-testid="presence-avatar-stack"
      aria-label={t`People currently viewing: ${memberNames}`}
    >
      <WorkspaceMemberAvatarStack
        defaultAvatarName={t`Workspace member`}
        maxVisible={5}
        totalWorkspaceMembersCount={workspaceMembers.length}
        workspaceMembers={workspaceMembers}
      />
      <StyledOnlineDot aria-hidden="true" />
      <AppTooltip
        anchorSelect={`#${tooltipId}`}
        content={memberNames}
        delay={TooltipDelay.longDelay}
        place={TooltipPosition.Bottom}
        noArrow
      />
    </StyledPresenceStack>
  );
};
