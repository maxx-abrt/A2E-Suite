import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledActionButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  height: ${themeCssVariables.spacing[7]};
  padding: 0 ${themeCssVariables.spacing[2]};
  text-align: left;
  text-decoration: none;
  transition: background calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;
  width: 100%;

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
    outline: none;
  }

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }
`;

const StyledActionLink = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[2]};
  height: ${themeCssVariables.spacing[7]};
  padding: 0 ${themeCssVariables.spacing[2]};
  text-decoration: none;
  transition: background calc(${themeCssVariables.animation.duration.fast} * 1s)
    ease;
  width: 100%;

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
    outline: none;
  }

  &[data-active='true'] {
    background: ${themeCssVariables.background.transparent.medium};
    color: ${themeCssVariables.font.color.primary};
    font-weight: ${themeCssVariables.font.weight.medium};
  }
`;

const StyledLabel = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledHint = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
`;

type BureauSidebarActionProps = {
  Icon: IconComponent;
  label: string;
  testId: string;
  to?: string;
  onClick?: () => void;
  isActive?: boolean;
  hint?: ReactNode;
};

export const BureauSidebarAction = ({
  Icon,
  label,
  testId,
  to,
  onClick,
  isActive = false,
  hint,
}: BureauSidebarActionProps) => {
  const content = (
    <>
      <Icon size={16} stroke={1.6} />
      <StyledLabel>{label}</StyledLabel>
      {hint ? <StyledHint>{hint}</StyledHint> : null}
    </>
  );

  if (to !== undefined) {
    return (
      <StyledActionLink
        to={to}
        data-active={isActive}
        data-testid={testId}
        aria-current={isActive ? 'page' : undefined}
      >
        {content}
      </StyledActionLink>
    );
  }

  return (
    <StyledActionButton
      type="button"
      onClick={onClick}
      data-active={isActive}
      data-testid={testId}
    >
      {content}
    </StyledActionButton>
  );
};
