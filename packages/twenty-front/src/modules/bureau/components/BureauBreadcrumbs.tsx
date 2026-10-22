import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { getBureauAncestors } from '@/bureau/utils/getBureauAncestors';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const MAX_VISIBLE_ANCESTORS = 3;

const StyledList = styled.ol`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[0.5]};
  list-style: none;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  padding: 0;
`;

const StyledItem = styled.li`
  align-items: center;
  display: flex;
  min-width: 0;
`;

const StyledCrumb = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[1]};
  max-width: 200px;
  padding: ${themeCssVariables.spacing[0.5]} ${themeCssVariables.spacing[1]};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    background: ${themeCssVariables.background.transparent.light};
    color: ${themeCssVariables.font.color.primary};
    outline: none;
  }
`;

const StyledCurrent = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  padding: ${themeCssVariables.spacing[0.5]} ${themeCssVariables.spacing[1]};
`;

const StyledCrumbTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledSeparator = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.md};
`;

type BureauBreadcrumbsProps = {
  page: BureauDocument;
};

export const BureauBreadcrumbs = ({ page }: BureauBreadcrumbsProps) => {
  const { t } = useLingui();
  const { tree } = useBureauWorkspace();
  const ancestors = getBureauAncestors(page.id, tree);
  const visibleAncestors: (BureauDocument | null)[] =
    ancestors.length > MAX_VISIBLE_ANCESTORS
      ? [ancestors[0], null, ...ancestors.slice(-(MAX_VISIBLE_ANCESTORS - 1))]
      : ancestors;
  const pageTitle = page.title?.trim() || t`Untitled`;

  return (
    <nav aria-label={t`Breadcrumb`} data-testid="bureau-breadcrumbs">
      <StyledList>
        <StyledItem>
          <StyledCrumb to={AppPath.Bureau} data-testid="bureau-breadcrumb-home">
            <StyledCrumbTitle>{t`Bureau`}</StyledCrumbTitle>
          </StyledCrumb>
        </StyledItem>
        {visibleAncestors.map((ancestor, index) => (
          <Fragment key={ancestor?.id ?? `collapsed-${index}`}>
            <StyledSeparator aria-hidden="true">/</StyledSeparator>
            <StyledItem>
              {ancestor === null ? (
                <StyledCurrent aria-label={t`More pages`}>…</StyledCurrent>
              ) : (
                <StyledCrumb
                  to={getBureauPagePath(ancestor.id)}
                  data-testid={`bureau-breadcrumb-${ancestor.id}`}
                >
                  <BureauPageIcon icon={ancestor.icon} />
                  <StyledCrumbTitle>
                    {ancestor.title?.trim() || t`Untitled`}
                  </StyledCrumbTitle>
                </StyledCrumb>
              )}
            </StyledItem>
          </Fragment>
        ))}
        <StyledSeparator aria-hidden="true">/</StyledSeparator>
        <StyledItem aria-current="page">
          <StyledCurrent data-testid="bureau-breadcrumb-current">
            <BureauPageIcon icon={page.icon} />
            <StyledCrumbTitle>{pageTitle}</StyledCrumbTitle>
          </StyledCurrent>
        </StyledItem>
      </StyledList>
    </nav>
  );
};
