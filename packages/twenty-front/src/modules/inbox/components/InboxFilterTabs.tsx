import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type InboxNotificationCategory } from '@/inbox/types/InboxNotification';

const INBOX_CATEGORIES: InboxNotificationCategory[] = [
  'all',
  'mentions',
  'assigned',
  'watching',
];

const StyledTabs = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
`;

const StyledTab = styled.button<{ isSelected: boolean }>`
  align-items: center;
  background: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.background.transparent.medium
      : 'transparent'};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.secondary};
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ isSelected }) =>
    isSelected
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

const StyledTabCount = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
`;

export type InboxFilterTabsProps = {
  selectedCategory: InboxNotificationCategory;
  countByCategory: Record<InboxNotificationCategory, number>;
  onSelectCategory: (category: InboxNotificationCategory) => void;
};

export const InboxFilterTabs = ({
  selectedCategory,
  countByCategory,
  onSelectCategory,
}: InboxFilterTabsProps) => {
  const { t } = useLingui();

  const getCategoryLabel = (category: InboxNotificationCategory) => {
    switch (category) {
      case 'all':
        return t`All`;
      case 'mentions':
        return t`Mentions`;
      case 'assigned':
        return t`Assigned`;
      case 'watching':
        return t`Watching`;
    }
  };

  return (
    <StyledTabs role="tablist" data-testid="inbox-filter-tabs">
      {INBOX_CATEGORIES.map((category) => (
        <StyledTab
          key={category}
          type="button"
          role="tab"
          aria-selected={category === selectedCategory}
          isSelected={category === selectedCategory}
          data-testid={`inbox-filter-${category}`}
          onClick={() => onSelectCategory(category)}
        >
          {getCategoryLabel(category)}
          <StyledTabCount>{countByCategory[category]}</StyledTabCount>
        </StyledTab>
      ))}
    </StyledTabs>
  );
};
