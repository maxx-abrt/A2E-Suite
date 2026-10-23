import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { Button } from 'twenty-ui/input';

import { A2eLearnMoreLink } from '@/a2e-help/components/A2eLearnMoreLink';
import { HomeWidgetList } from '@/home-dashboard/components/HomeWidgetList';
import { type HomeWidgetListEntry } from '@/home-dashboard/types/HomeWidgetListEntry';

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  padding: 0 ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[2]};
`;

export type PendingBilanWidgetContentProps = {
  entries: HomeWidgetListEntry[];
  onSelectEntry?: (itemId: string) => void;
  // The Bilan doc link is only meaningful when the app is installed; without
  // it the widget degrades to the same empty list the host already shows.
  isBilanInstalled?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
};

export const PendingBilanWidgetContent = ({
  entries,
  onSelectEntry,
  isBilanInstalled = false,
  isLoading = false,
  hasError = false,
  onRetry,
}: PendingBilanWidgetContentProps) => {
  const { t } = useLingui();

  return (
    <StyledContainer>
      {hasError ? (
        <>
          <p role="status">{t`Could not load pending items.`}</p>
          <Button
            title={t`Retry`}
            ariaLabel={t`Retry`}
            variant="secondary"
            size="small"
            onClick={onRetry}
          />
        </>
      ) : isLoading && entries.length === 0 ? (
        <p role="status">{t`Loading pending items…`}</p>
      ) : (
        <HomeWidgetList
          testId="home-pending-bilan"
          emptyLabel={t`Nothing pending in Bilan`}
          entries={entries}
          onSelectEntry={onSelectEntry}
        />
      )}
      {isBilanInstalled && <A2eLearnMoreLink appKey="bilan" />}
    </StyledContainer>
  );
};
