import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledEntry = styled.li<{ isOverdue: boolean }>`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledEntryBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledEntryTitle = styled.span`
  color: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEntrySubtitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledEntryTrailing = styled.span`
  color: inherit;
  font-size: ${themeCssVariables.font.size.xs};
  white-space: nowrap;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export type HomeWidgetListProps = {
  entries: HomeWidgetListEntry[];
  emptyLabel: string;
  testId: string;
};

export const HomeWidgetList = ({
  entries,
  emptyLabel,
  testId,
}: HomeWidgetListProps) => {
  if (entries.length === 0) {
    return (
      <StyledEmptyState data-testid={`${testId}-empty`}>
        {emptyLabel}
      </StyledEmptyState>
    );
  }

  return (
    <StyledList data-testid={testId}>
      {entries.map((entry) => (
        <StyledEntry
          key={entry.id}
          isOverdue={entry.isOverdue === true}
          data-testid={`${testId}-entry-${entry.id}`}
        >
          <StyledEntryBody>
            <StyledEntryTitle>{entry.title}</StyledEntryTitle>
            {entry.subtitle !== undefined && (
              <StyledEntrySubtitle>{entry.subtitle}</StyledEntrySubtitle>
            )}
          </StyledEntryBody>
          {entry.trailingLabel !== undefined && (
            <StyledEntryTrailing>{entry.trailingLabel}</StyledEntryTrailing>
          )}
        </StyledEntry>
      ))}
    </StyledList>
  );
};
