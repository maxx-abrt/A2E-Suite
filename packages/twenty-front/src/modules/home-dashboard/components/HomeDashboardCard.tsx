import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { IconArrowUpRight, type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme-constants';

import { WidgetCard } from '@/page-layout/widgets/widget-card/components/WidgetCard';
import { WidgetCardHeaderActionLink } from '@/page-layout/widgets/widget-card/components/WidgetCardHeaderActionLink';

const StyledHeader = styled.header`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[2]};
  height: ${themeCssVariables.spacing[6]};
`;

const StyledHeaderIcon = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
`;

const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// Bounded so one long list never stretches its whole grid row.
const StyledBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  margin-top: ${themeCssVariables.spacing[1]};
  max-height: 360px;
  min-height: 0;
  overflow-y: auto;
`;

export type HomeDashboardCardSeeAllLink = {
  label: string;
  to: string;
};

export type HomeDashboardCardProps = {
  title: string;
  Icon: IconComponent;
  testId: string;
  seeAllLink?: HomeDashboardCardSeeAllLink;
  children: ReactNode;
};

// Reuses the native framed dashboard card so Home reads like any other
// page-layout surface instead of a bespoke panel.
export const HomeDashboardCard = ({
  title,
  Icon,
  testId,
  seeAllLink,
  children,
}: HomeDashboardCardProps) => {
  const theme = useTheme();

  return (
    <WidgetCard
      variant="framed"
      isEditable={false}
      isEditing={false}
      isDragging={false}
      isResizing={false}
      data-testid={testId}
    >
      <StyledHeader>
        <StyledHeaderIcon>
          <Icon size={theme.icon.size.md} aria-hidden />
        </StyledHeaderIcon>
        <StyledTitle>{title}</StyledTitle>
        {seeAllLink !== undefined && (
          <WidgetCardHeaderActionLink
            Icon={IconArrowUpRight}
            label={seeAllLink.label}
            to={seeAllLink.to}
          />
        )}
      </StyledHeader>
      <StyledBody>{children}</StyledBody>
    </WidgetCard>
  );
};
