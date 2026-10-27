import { type BureauArchiveImportPlan } from '@/blocknote-editor/import/utils/bureauArchiveImport';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { lazy, Suspense, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const BureauImportPagePreview = lazy(() =>
  import('@/bureau/components/BureauImportPagePreview').then((module) => ({
    default: module.BureauImportPagePreview,
  })),
);

const StyledReview = styled.div`
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: grid;
  grid-template-columns: minmax(180px, 28%) minmax(0, 1fr);
  min-height: 320px;
  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
const StyledPages = styled.nav`
  background: ${themeCssVariables.background.secondary};
  border-right: 1px solid ${themeCssVariables.border.color.medium};
  max-height: 420px;
  overflow: auto;
  padding: ${themeCssVariables.spacing[2]};
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 600px) {
    max-height: 160px;
    border-right: 0;
    border-bottom: 1px solid ${themeCssVariables.border.color.medium};
  }
`;
const StyledPage = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  text-align: left;
  width: 100%;
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  svg {
    flex-shrink: 0;
  }
  &[aria-pressed='true'],
  &:hover {
    background: ${themeCssVariables.background.transparent.medium};
  }
  &:focus-visible {
    outline: 2px solid ${themeCssVariables.color.blue};
  }
`;
const StyledContent = styled.section`
  max-height: 420px;
  min-width: 0;
  overflow: auto;
  p {
    color: ${themeCssVariables.font.color.secondary};
    font-size: ${themeCssVariables.font.size.sm};
  }
`;
const StyledSearch = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  margin-bottom: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

export const BureauImportReview = ({
  plan,
}: {
  plan: BureauArchiveImportPlan;
}) => {
  const { t } = useLingui();
  const [selectedPath, setSelectedPath] = useState(plan.pages[0]?.path);
  const [search, setSearch] = useState('');
  const selectedPage = plan.pages.find((page) => page.path === selectedPath);
  const childrenByParent = new Map<string | null, typeof plan.pages>();
  for (const page of plan.pages) {
    const siblings = childrenByParent.get(page.parentPath) ?? [];
    siblings.push(page);
    childrenByParent.set(page.parentPath, siblings);
  }
  const pending = (childrenByParent.get(null) ?? [])
    .map((page) => ({ page, depth: 0 }))
    .reverse();
  const rows: { page: (typeof plan.pages)[number]; depth: number }[] = [];
  while (pending.length > 0) {
    const row = pending.pop();
    if (!row) break;
    rows.push(row);
    pending.push(
      ...(childrenByParent.get(row.page.path) ?? [])
        .map((page) => ({ page, depth: row.depth + 1 }))
        .reverse(),
    );
  }

  return (
    <StyledReview>
      <StyledPages aria-label={t`Pages in export`}>
        <StyledSearch
          type="search"
          aria-label={t`Find a page in this export`}
          placeholder={t`Find a page…`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul>
          {rows
            .filter(({ page }) =>
              `${page.title} ${page.path}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map(({ page, depth }) => (
              <li key={page.path}>
                <StyledPage
                  type="button"
                  title={page.path}
                  aria-pressed={page.path === selectedPath}
                  style={{ paddingLeft: 8 + Math.min(depth, 8) * 12 }}
                  onClick={() => setSelectedPath(page.path)}
                >
                  <BureauPageIcon icon={null} />
                  <span>{page.title}</span>
                </StyledPage>
              </li>
            ))}
        </ul>
      </StyledPages>
      <StyledContent aria-label={t`Page preview`}>
        <ErrorBoundary
          key={selectedPath}
          fallback={
            <p role="alert">{t`This page could not be previewed. Select another page or check the source export.`}</p>
          }
        >
          <Suspense fallback={<p role="status">{t`Preparing preview…`}</p>}>
            {selectedPage && (
              <BureauImportPagePreview
                key={selectedPage.path}
                page={selectedPage}
                plan={plan}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </StyledContent>
    </StyledReview>
  );
};
