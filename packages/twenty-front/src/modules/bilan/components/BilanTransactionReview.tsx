import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { bilanReviewScopeState } from '@/bilan/states/bilanReviewScopeState';
import {
  buildBilanReviewView,
  type BilanReviewScope,
} from '@/bilan/utils/buildBilanReviewView';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { useObjectPermissionsForObject } from '@/object-record/hooks/useObjectPermissionsForObject';
import { PageLayoutEditModeProviderContext } from '@/page-layout/contexts/PageLayoutEditModeContext';
import { PageLayoutComponentInstanceContext } from '@/page-layout/states/contexts/PageLayoutComponentInstanceContext';
import { RecordTableWidgetRendererContent } from '@/page-layout/widgets/record-table/components/RecordTableWidgetRendererContent';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomFamilyState } from '@/ui/utilities/state/jotai/hooks/useAtomFamilyState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { viewsFromObjectMetadataItemFamilySelector } from '@/views/states/selectors/viewsFromObjectMetadataItemFamilySelector';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AppPath } from 'twenty-shared/types';
import { getAppPath, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { ViewKey, ViewType } from '~/generated-metadata/graphql';

const StyledSection = styled.section`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.lg};
  min-width: 0;
  overflow: hidden;
`;
const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${themeCssVariables.spacing[3]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[4]};
`;
const StyledTitle = styled.h2`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin: 0;
`;
const StyledDescription = styled.p`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: ${themeCssVariables.spacing[1]} 0 0;
`;
const StyledFilters = styled.div`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  overflow-x: auto;
  padding: 0 ${themeCssVariables.spacing[4]} ${themeCssVariables.spacing[3]};
`;
const StyledFilter = styled.button`
  background: transparent;
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  flex-shrink: 0;
  font: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  &[aria-pressed='true'] {
    background: ${themeCssVariables.background.tertiary};
    color: ${themeCssVariables.font.color.primary};
  }
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
    outline-offset: -2px;
  }
`;
const StyledTable = styled.div`
  display: flex;
  flex-direction: column;
  height: 360px;
  min-height: 0;
`;
const ReviewError = () => {
  const { t } = useLingui();
  return (
    <StyledHeader role="status">{t`Transactions could not load. Open all transactions to continue.`}</StyledHeader>
  );
};

export const BilanTransactionReview = ({
  objectMetadataItem,
}: {
  objectMetadataItem: EnrichedObjectMetadataItem;
}) => {
  const { t } = useLingui();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const objectPermissions = useObjectPermissionsForObject(
    objectMetadataItem.id,
  );
  const views = useAtomFamilySelectorValue(
    viewsFromObjectMetadataItemFamilySelector,
    { objectMetadataItemId: objectMetadataItem.id },
  );
  const tableViews = views.filter(
    (candidate) => candidate.type === ViewType.TABLE,
  );
  const compactView = tableViews
    .filter(
      (candidate) =>
        candidate.viewFields.some((field) => field.isVisible !== false) &&
        (candidate.viewFilters?.length ?? 0) === 0 &&
        (candidate.viewFilterGroups?.length ?? 0) === 0 &&
        !candidate.anyFieldFilterValue,
    )
    .toSorted(
      (first, second) =>
        first.viewFields.filter((field) => field.isVisible !== false).length -
        second.viewFields.filter((field) => field.isVisible !== false).length,
    )[0];
  const view =
    compactView ??
    tableViews.find((candidate) => candidate.key === ViewKey.INDEX) ??
    tableViews[0];
  const [preferredScope, setPreferredScope] = useAtomFamilyState(
    bilanReviewScopeState,
    {
      objectMetadataId: objectMetadataItem.id,
      workspaceMemberId: currentWorkspaceMember?.id ?? 'anonymous',
    },
  );
  const hasField = (name: string) =>
    objectMetadataItem.readableFields.some((field) => field.name === name);
  const scopes: BilanReviewScope[] = [
    ...(hasField('amount') || hasField('entryDate') || hasField('label')
      ? ['details' as const]
      : []),
    ...(hasField('receipts') && hasField('entryType')
      ? ['receipts' as const]
      : []),
    ...(hasField('category') ? ['category' as const] : []),
    'all',
  ];
  const scope = scopes.includes(preferredScope) ? preferredScope : scopes[0];
  const labels = {
    details: t`Missing details`,
    receipts: t`Missing receipts`,
    category: t`Uncategorized`,
    all: t`All transactions`,
  };
  const descriptions = {
    details: t`Complete the description, amount and payment date. Unreviewed captures stay out of your cash book.`,
    receipts: t`Attach supporting documents to expenses that have no receipt.`,
    category: t`Choose a category to keep your reporting useful.`,
    all: t`Track recorded income and expenses with their original supporting documents.`,
  };
  const reviewView = useMemo(
    () =>
      isDefined(view)
        ? buildBilanReviewView({
            view,
            scope,
            readableFields: objectMetadataItem.readableFields,
          })
        : undefined,
    [view, scope, objectMetadataItem.readableFields],
  );
  const widgetId = `bilan-review-${objectMetadataItem.id}`;
  if (!isDefined(view) || !objectPermissions.canReadObjectRecords) return null;

  return (
    <StyledSection aria-label={t`Transaction review`}>
      <StyledHeader>
        <div>
          <StyledTitle>{t`Transaction review`}</StyledTitle>
          <StyledDescription>{descriptions[scope]}</StyledDescription>
        </div>
        <Button
          title={t`Open transactions`}
          ariaLabel={t`Open transactions`}
          variant="secondary"
          size="small"
          to={getAppPath(AppPath.RecordIndexPage, {
            objectNamePlural: objectMetadataItem.namePlural,
          })}
        />
      </StyledHeader>
      <StyledFilters role="group" aria-label={t`Review filters`}>
        {scopes.map((value) => (
          <StyledFilter
            type="button"
            key={value}
            aria-pressed={scope === value}
            onClick={() => setPreferredScope(value)}
          >
            {labels[value]}
          </StyledFilter>
        ))}
      </StyledFilters>
      <PageLayoutEditModeProviderContext value={{ isInEditMode: false }}>
        <PageLayoutComponentInstanceContext.Provider
          value={{ instanceId: widgetId }}
        >
          <ErrorBoundary
            FallbackComponent={ReviewError}
            resetKeys={[objectMetadataItem.id, view.id, scope]}
          >
            <StyledTable>
              <RecordTableWidgetRendererContent
                key={`${view.id}-${scope}`}
                objectMetadataId={objectMetadataItem.id}
                viewId={view.id}
                viewOverride={reviewView}
                widgetId={widgetId}
                instanceIdSuffix={scope}
                isUIEditable={objectPermissions.canUpdateObjectRecords}
                isCreationEnabled={false}
              />
            </StyledTable>
          </ErrorBoundary>
        </PageLayoutComponentInstanceContext.Provider>
      </PageLayoutEditModeProviderContext>
    </StyledSection>
  );
};
