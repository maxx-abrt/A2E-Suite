import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { BlockEditorDocumentContext } from '@/blocknote-editor/contexts/BlockEditorDocumentContext';
import { buildChildDocumentInput } from '@/blocknote-editor/utils/buildChildDocumentInput';
import { MentionRecordChip } from '@/mention/components/MentionRecordChip';
import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { createReactBlockSpec } from '@blocknote/react';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { useContext, useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledPageLinkRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledPageLinkInput = styled.input`
  background: transparent;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  height: 28px;
  min-width: 0;
  padding: 0 ${themeCssVariables.spacing[2]};
`;

type PageLinkRenderProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
  blockId: string;
  documentId: string;
  title: string;
};

const PageLinkRender = ({
  editor,
  blockId,
  documentId,
  title,
}: PageLinkRenderProps) => {
  const parentDocumentId = useContext(BlockEditorDocumentContext);
  const [draftTitle, setDraftTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { createOneRecord } = useCreateOneRecord({
    objectNameSingular: 'document',
    recordGqlFields: { id: true, title: true },
  });

  const handleCreateSubPage = async () => {
    const trimmedTitle = draftTitle.trim();

    if (trimmedTitle.length === 0) {
      return;
    }

    setIsCreating(true);

    try {
      const createdDocument = await createOneRecord(
        buildChildDocumentInput({
          title: trimmedTitle,
          parentDocumentId: parentDocumentId ?? undefined,
        }),
      );

      editor.updateBlock(blockId, {
        props: { documentId: createdDocument.id, title: trimmedTitle },
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isNonEmptyString(documentId)) {
    return (
      <StyledPageLinkRow contentEditable={false}>
        <MentionRecordChip
          recordId={documentId}
          objectNameSingular="document"
          label={title}
          imageUrl=""
        />
      </StyledPageLinkRow>
    );
  }

  return (
    <StyledPageLinkRow contentEditable={false}>
      <StyledPageLinkInput
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        placeholder={t`Sub-page title`}
      />
      <Button
        title={t`Create sub-page`}
        size="small"
        Icon={IconPlus}
        disabled={isCreating || draftTitle.trim().length === 0}
        onClick={handleCreateSubPage}
      />
    </StyledPageLinkRow>
  );
};

export const PageLinkBlock = createReactBlockSpec(
  {
    type: 'pageLink',
    propSchema: {
      documentId: {
        default: '',
      },
      title: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <PageLinkRender
        editor={editor as unknown as typeof BLOCK_SCHEMA.BlockNoteEditor}
        blockId={block.id}
        documentId={block.props.documentId}
        title={block.props.title}
      />
    ),
    toExternalHTML: ({ block }) =>
      isNonEmptyString(block.props.title) ? <p>{block.props.title}</p> : <p />,
  },
);
