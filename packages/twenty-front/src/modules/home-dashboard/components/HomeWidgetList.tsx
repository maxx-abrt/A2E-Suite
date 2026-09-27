import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

const StyledList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: calc(2px * var(--a2e-density-gap-scale, 1));
  list-style: none;
  margin: 0;
  padding: calc(
      ${themeCssVariables.spacing[2]} * var(--a2e-density-gap-scale, 1)
    )
    ${themeCssVariables.spacing[3]};
`;

const StyledEntry = styled.li<{ isOverdue: boolean }>`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.primary};
  display: flex;
  gap: calc(${themeCssVariables.spacing[2]} * var(--a2e-density-gap-scale, 1));
  padding: calc(
    ${themeCssVariables.spacing[2]} * var(--a2e-density-gap-scale, 1)
  );

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

// Selectable rows stretch the button over the whole row so the hover target,
// the click target and the keyboard focus ring are the same box.
const StyledSelectableEntry = styled.li<{ isOverdue: boolean }>`
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isOverdue }) =>
    isOverdue
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.primary};
  display: flex;

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledEntryButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: inherit;
  color: inherit;
  cursor: pointer;
  display: flex;
  flex: 1;
  font-family: inherit;
  gap: calc(${themeCssVariables.spacing[2]} * var(--a2e-density-gap-scale, 1));
  min-width: 0;
  padding: calc(
    ${themeCssVariables.spacing[2]} * var(--a2e-density-gap-scale, 1)
  );
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
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
  onSelectEntry?: (entryId: string) => void;
};

const HomeWidgetListEntryContent = ({
  entry,
}: {
  entry: HomeWidgetListEntry;
}) => (
  <>
    <StyledEntryBody>
      <StyledEntryTitle>{entry.title}</StyledEntryTitle>
      {entry.subtitle !== undefined && (
        <StyledEntrySubtitle>{entry.subtitle}</StyledEntrySubtitle>
      )}
    </StyledEntryBody>
    {entry.trailingLabel !== undefined && (
      <StyledEntryTrailing>{entry.trailingLabel}</StyledEntryTrailing>
    )}
  </>
);

export const HomeWidgetList = ({
  entries,
  emptyLabel,
  testId,
  onSelectEntry,
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
      {entries.map((entry) =>
        onSelectEntry !== undefined ? (
          <StyledSelectableEntry
            key={entry.id}
            isOverdue={entry.isOverdue === true}
            data-testid={`${testId}-entry-${entry.id}`}
          >
            <StyledEntryButton
              type="button"
              onClick={() => onSelectEntry(entry.id)}
            >
              <HomeWidgetListEntryContent entry={entry} />
            </StyledEntryButton>
          </StyledSelectableEntry>
        ) : (
          <StyledEntry
            key={entry.id}
            isOverdue={entry.isOverdue === true}
            data-testid={`${testId}-entry-${entry.id}`}
          >
            <HomeWidgetListEntryContent entry={entry} />
          </StyledEntry>
        ),
      )}
    </StyledList>
  );
};
