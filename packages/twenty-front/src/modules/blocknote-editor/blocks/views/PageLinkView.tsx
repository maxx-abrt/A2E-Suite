import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPageLinkRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

export type PageLinkViewProps = {
  documentId: string;
  title: string;
};

// Provider-free view of a sub-page link: a single record chip. Creation of the
// child document stays in the block, which owns the mutation context.
export const PageLinkView = ({ documentId, title }: PageLinkViewProps) => (
  <StyledPageLinkRow contentEditable={false}>
    <MentionRecordChip
      recordId={documentId}
      objectNameSingular="document"
      label={title}
      imageUrl=""
    />
  </StyledPageLinkRow>
);
