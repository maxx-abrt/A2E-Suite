import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { buildBookmarkCardFromUrl } from '@/blocknote-editor/utils/buildBookmarkCardFromUrl';
import { createReactBlockSpec } from '@blocknote/react';
import { t } from '@lingui/core/macro';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { IconLink } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBookmarkCard = styled.a`
  align-items: center;
  background: ${themeCssVariables.background.transparent.light};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  max-width: 100%;
  padding: ${themeCssVariables.spacing[2]};
  text-decoration: none;
  width: fit-content;

  &:hover {
    border-color: ${themeCssVariables.border.color.medium};
  }
`;

const StyledBookmarkBody = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledBookmarkTitle = styled.span`
  font-weight: ${themeCssVariables.font.weight.medium};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBookmarkHostname = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledBookmarkInputRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  width: 100%;
`;

const StyledBookmarkInput = styled.input`
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

type BookmarkRenderProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
  blockId: string;
  url: string;
  title: string;
  hostname: string;
};

const BookmarkRender = ({
  editor,
  blockId,
  url,
  title,
  hostname,
}: BookmarkRenderProps) => {
  const [draftUrl, setDraftUrl] = useState('');

  const handleAddBookmark = () => {
    const bookmarkCard = buildBookmarkCardFromUrl(draftUrl);

    if (!isDefined(bookmarkCard)) {
      return;
    }

    editor.updateBlock(blockId, {
      props: {
        url: bookmarkCard.url,
        title: bookmarkCard.title,
        hostname: bookmarkCard.hostname,
      },
    });
  };

  if (isNonEmptyString(url)) {
    return (
      <StyledBookmarkCard
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        contentEditable={false}
      >
        <IconLink size={16} />
        <StyledBookmarkBody>
          <StyledBookmarkTitle>{title || hostname}</StyledBookmarkTitle>
          <StyledBookmarkHostname>{hostname}</StyledBookmarkHostname>
        </StyledBookmarkBody>
      </StyledBookmarkCard>
    );
  }

  return (
    <StyledBookmarkInputRow contentEditable={false}>
      <StyledBookmarkInput
        value={draftUrl}
        onChange={(event) => setDraftUrl(event.target.value)}
        placeholder={t`Paste a link`}
      />
      <Button
        title={t`Add bookmark`}
        size="small"
        disabled={draftUrl.trim().length === 0}
        onClick={handleAddBookmark}
      />
    </StyledBookmarkInputRow>
  );
};

export const BookmarkBlock = createReactBlockSpec(
  {
    type: 'bookmark',
    propSchema: {
      url: {
        default: '',
      },
      title: {
        default: '',
      },
      hostname: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <BookmarkRender
        editor={editor as unknown as typeof BLOCK_SCHEMA.BlockNoteEditor}
        blockId={block.id}
        url={block.props.url}
        title={block.props.title}
        hostname={block.props.hostname}
      />
    ),
    toExternalHTML: ({ block }) =>
      isNonEmptyString(block.props.url) ? (
        <p>
          <a href={block.props.url}>{block.props.title || block.props.url}</a>
        </p>
      ) : (
        <p />
      ),
  },
);
