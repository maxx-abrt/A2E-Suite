import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTypingIndicator = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 1;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  white-space: nowrap;
`;

const StyledTypingText = styled.span`
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StyledDots = styled.span`
  display: inline-flex;
  gap: 2px;

  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
      opacity: 0.65;
    }
  }
`;

const StyledDot = styled.span<{ delay: number }>`
  animation: typing-dot 1.2s ease-in-out infinite;
  animation-delay: ${({ delay }) => `${delay}ms`};
  background: ${themeCssVariables.font.color.tertiary};
  border-radius: 50%;
  height: 3px;
  opacity: 0.35;
  width: 3px;

  @keyframes typing-dot {
    0%,
    60%,
    100% {
      opacity: 0.35;
      transform: translateY(0);
    }

    30% {
      opacity: 1;
      transform: translateY(-1px);
    }
  }
`;

const getDisplayName = (workspaceMember: PartialWorkspaceMember) => {
  const firstName = workspaceMember.name?.firstName?.trim();

  return firstName || workspaceMember.userEmail;
};

export const RealtimeTypingIndicator = ({
  workspaceMembers,
}: {
  workspaceMembers: PartialWorkspaceMember[];
}) => {
  const { t } = useLingui();

  if (workspaceMembers.length === 0) {
    return null;
  }

  const label =
    workspaceMembers.length === 1
      ? t`${getDisplayName(workspaceMembers[0])} is typing…`
      : t`${workspaceMembers.length} people are typing…`;

  return (
    <StyledTypingIndicator
      data-testid="presence-typing-indicator"
      role="status"
      aria-live="polite"
    >
      <StyledTypingText data-testid="presence-typing-text">
        {label}
      </StyledTypingText>
      <StyledDots aria-hidden="true">
        <StyledDot delay={0} />
        <StyledDot delay={120} />
        <StyledDot delay={240} />
      </StyledDots>
    </StyledTypingIndicator>
  );
};
