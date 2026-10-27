import { BureauModal } from '@/bureau/components/BureauModal';
import { BureauPageIcon } from '@/bureau/components/BureauPageIcon';
import { BUREAU_SEARCH_MODAL_ID } from '@/bureau/constants/BureauSearchModalId';
import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';
import { useBureauWorkspace } from '@/bureau/hooks/useBureauWorkspace';
import { type BureauDocument } from '@/bureau/types/BureauDocument';
import { getBureauPagePath } from '@/bureau/utils/getBureauPagePath';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { escapeForIlike, isDefined } from 'twenty-shared/utils';
import { useDebounce } from 'use-debounce';

import { themeCssVariables } from 'twenty-ui/theme-constants';

const SEARCH_RESULT_LIMIT = 50;

const StyledInput = styled.input`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font: inherit;
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledResult = styled(Link)`
  align-items: center;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  padding: ${themeCssVariables.spacing[2]};
  text-decoration: none;
  &[data-active='true'],
  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

export const BureauSearchModal = () => (
  <BureauModal modalId={BUREAU_SEARCH_MODAL_ID}>
    <BureauSearchContent />
  </BureauModal>
);

const BureauSearchContent = () => {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { documents } = useBureauWorkspace();
  const { closeModal } = useModal();
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query.trim(), 250);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pattern = `%${escapeForIlike(debouncedQuery)}%`;
  const { records, loading, error } = useFindManyRecords<BureauDocument>({
    objectNameSingular: 'document',
    filter: {
      or: [
        { title: { ilike: pattern } },
        { content: { markdown: { ilike: pattern } } },
      ],
    },
    recordGqlFields: BUREAU_TREE_RECORD_GQL_FIELDS,
    orderBy: [{ updatedAt: 'DescNullsLast' }],
    limit: SEARCH_RESULT_LIMIT,
    skip: !debouncedQuery,
  });
  const isSearching = query.trim() !== debouncedQuery || loading;
  const results = isSearching
    ? []
    : debouncedQuery
      ? records
      : [...documents]
          .sort((first, second) =>
            (second.updatedAt ?? '').localeCompare(first.updatedAt ?? ''),
          )
          .slice(0, SEARCH_RESULT_LIMIT);
  const activeIndex = Math.min(selectedIndex, results.length - 1);

  return (
    <>
      <h2>{t`Search pages`}</h2>
      <StyledInput
        autoFocus
        aria-label={t`Search pages`}
        placeholder={t`Search titles and page content…`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSelectedIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex(
              Math.max(
                0,
                Math.min(
                  results.length - 1,
                  activeIndex + (event.key === 'ArrowDown' ? 1 : -1),
                ),
              ),
            );
          }
          if (event.key === 'Enter' && isDefined(results[activeIndex])) {
            event.preventDefault();
            closeModal(BUREAU_SEARCH_MODAL_ID);
            // oxlint-disable-next-line twenty/no-navigate-prefer-link
            navigate(getBureauPagePath(results[activeIndex].id));
          }
        }}
      />
      {isSearching && <p role="status">{t`Searching…`}</p>}
      {error && (
        <p role="alert">{t`Could not search page content. Please try again.`}</p>
      )}
      {!isSearching && results.length === 0 && <p>{t`No pages found`}</p>}
      <div aria-label={t`Search results`}>
        {results.map((page, index) => (
          <StyledResult
            key={page.id}
            to={getBureauPagePath(page.id)}
            data-active={index === activeIndex}
            onClick={() => closeModal(BUREAU_SEARCH_MODAL_ID)}
          >
            <BureauPageIcon icon={page.icon} />
            {page.title?.trim() || t`Untitled`}
          </StyledResult>
        ))}
      </div>
      {results.length === SEARCH_RESULT_LIMIT && (
        <p>{t`Showing the first 50 results. Refine your search to find more.`}</p>
      )}
    </>
  );
};
