import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import {
  IconAlertTriangle,
  IconAt,
  IconClock,
  IconX,
  type IconComponent,
} from 'twenty-ui/icon';
import { IconButton } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { formatHomeWidgetDayLabel } from '@/home-dashboard/utils/formatHomeWidgetDayLabel';
import {
  type HomeSuggestion,
  type HomeSuggestionKind,
} from '@/home-dashboard/utils/buildHomeSuggestions';

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
  width: 100%;
`;

const StyledCard = styled.li<{ isOverdue: boolean }>`
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

const StyledIcon = styled.span`
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  padding-top: 2px;
`;

const StyledCardLink = styled.a`
  color: inherit;
  display: flex;
  flex: 1;
  gap: ${themeCssVariables.spacing[2]};
  min-width: 0;
  text-decoration: none;
`;

const StyledCardBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const StyledTitle = styled.span`
  color: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSubtitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledTrailing = styled.div`
  align-items: center;
  display: flex;
`;

const StyledEmptyState = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

export type HomeSuggestionsWidgetContentProps = {
  suggestions: HomeSuggestion[];
  onOpenSuggestion: (suggestion: HomeSuggestion) => void;
  onDismissSuggestion: (suggestionId: string) => void;
};

export const HomeSuggestionsWidgetContent = ({
  suggestions,
  onOpenSuggestion,
  onDismissSuggestion,
}: HomeSuggestionsWidgetContentProps) => {
  const { t } = useLingui();

  const getKindLabel = (kind: HomeSuggestionKind): string => {
    switch (kind) {
      case 'OVERDUE_TASK':
        return t`Overdue task`;
      case 'STALE_TASK':
        return t`Stale task`;
      case 'UNREAD_MENTION':
        return t`Unread mention`;
    }
  };

  const getKindIcon = (kind: HomeSuggestionKind): IconComponent => {
    switch (kind) {
      case 'OVERDUE_TASK':
        return IconAlertTriangle;
      case 'STALE_TASK':
        return IconClock;
      case 'UNREAD_MENTION':
        return IconAt;
    }
  };

  const getSuggestionTitle = (suggestion: HomeSuggestion): string => {
    if (
      suggestion.contextLabel !== null &&
      suggestion.contextLabel.length > 0
    ) {
      return suggestion.contextLabel;
    }

    return suggestion.kind === 'UNREAD_MENTION'
      ? t`Someone mentioned you`
      : t`A task needs your attention`;
  };

  if (suggestions.length === 0) {
    return (
      <StyledEmptyState data-testid="home-suggestions-empty">
        {t`Nothing needs attention`}
      </StyledEmptyState>
    );
  }

  return (
    <StyledList data-testid="home-suggestions">
      {suggestions.map((suggestion) => {
        const KindIcon = getKindIcon(suggestion.kind);
        const dayLabel = formatHomeWidgetDayLabel(suggestion.occurredAt);
        const subtitle =
          dayLabel.length > 0
            ? `${getKindLabel(suggestion.kind)} · ${dayLabel}`
            : getKindLabel(suggestion.kind);

        const body = (
          <StyledCardBody>
            <StyledTitle>{getSuggestionTitle(suggestion)}</StyledTitle>
            <StyledSubtitle>{subtitle}</StyledSubtitle>
          </StyledCardBody>
        );

        return (
          <StyledCard
            key={suggestion.id}
            isOverdue={suggestion.isOverdue}
            data-testid={`home-suggestion-${suggestion.id}`}
          >
            <StyledIcon aria-hidden="true">
              <KindIcon size={16} />
            </StyledIcon>
            {suggestion.deepLink !== null ? (
              <StyledCardLink
                href={suggestion.deepLink}
                data-testid={`home-suggestion-link-${suggestion.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenSuggestion(suggestion);
                }}
              >
                {body}
              </StyledCardLink>
            ) : (
              body
            )}
            <StyledTrailing>
              <IconButton
                Icon={IconX}
                size="small"
                variant="tertiary"
                accent="default"
                ariaLabel={t`Dismiss suggestion`}
                dataTestId={`home-suggestion-dismiss-${suggestion.id}`}
                onClick={() => onDismissSuggestion(suggestion.id)}
              />
            </StyledTrailing>
          </StyledCard>
        );
      })}
    </StyledList>
  );
};
