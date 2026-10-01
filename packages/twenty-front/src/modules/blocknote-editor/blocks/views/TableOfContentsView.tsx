import { type BlockOutlineEntry } from '@/blocknote-editor/editor-status/utils/getBlockOutline';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTableOfContents = styled.nav`
  border-left: 2px solid ${themeCssVariables.border.color.medium};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  margin: ${themeCssVariables.spacing[2]} 0;
  padding: ${themeCssVariables.spacing[1]} 0 ${themeCssVariables.spacing[1]}
    ${themeCssVariables.spacing[3]};
`;

const StyledEntry = styled.button<{ $level: number }>`
  background: none;
  border: none;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${({ $level }) =>
    $level <= 1
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  padding-left: ${({ $level }) => `${(Math.min($level, 6) - 1) * 12}px`};
  text-align: left;

  &:hover {
    color: ${themeCssVariables.font.color.primary};
  }
`;

const StyledEmptyState = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-style: italic;
`;

export type TableOfContentsViewProps = {
  entries: BlockOutlineEntry[];
  onEntryClick?: (blockId: string) => void;
};

// Provider-free view: the outline is passed in so the block can derive it from
// the live editor while stories can render headings that never existed.
export const TableOfContentsView = ({
  entries,
  onEntryClick,
}: TableOfContentsViewProps) => {
  const { t } = useLingui();

  if (entries.length === 0) {
    return (
      <StyledTableOfContents aria-label={t`Table of contents`}>
        <StyledEmptyState>{t`No headings yet`}</StyledEmptyState>
      </StyledTableOfContents>
    );
  }

  return (
    <StyledTableOfContents aria-label={t`Table of contents`}>
      {entries.map((entry) => (
        <StyledEntry
          key={entry.blockId}
          type="button"
          $level={entry.level}
          onClick={() => onEntryClick?.(entry.blockId)}
        >
          {entry.text.length > 0 ? entry.text : t`Untitled heading`}
        </StyledEntry>
      ))}
    </StyledTableOfContents>
  );
};
