import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { FileIcon } from '@/file/components/FileIcon';
import { getFileEmbedKind } from '@/blocknote-editor/utils/getFileEmbedKind';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledFileLine = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledLink = styled.a`
  align-items: center;
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  text-decoration: none;
  :hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

const StyledEmbedImage = styled.img`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.sm};
  display: block;
  max-width: 100%;
`;

const StyledEmbedVideo = styled.video`
  display: block;
  max-width: 100%;
`;

const StyledEmbedAudio = styled.audio`
  display: block;
  width: 100%;
`;

export type FileEmbedViewProps = {
  url: string;
  name: string;
  fileCategory: AttachmentFileCategory;
};

// Provider-free view of a stored attachment: media the browser can play is
// inlined, everything else renders a download link. The upload control stays
// in the block, which owns the editor upload hook.
export const FileEmbedView = ({
  url,
  name,
  fileCategory,
}: FileEmbedViewProps) => {
  const embedKind = getFileEmbedKind(fileCategory);

  if (embedKind === 'image') {
    return <StyledEmbedImage src={url} alt={name} contentEditable={false} />;
  }

  if (embedKind === 'video') {
    return <StyledEmbedVideo src={url} controls contentEditable={false} />;
  }

  if (embedKind === 'audio') {
    return <StyledEmbedAudio src={url} controls contentEditable={false} />;
  }

  return (
    <StyledFileLine>
      <FileIcon fileCategory={fileCategory} thumbnailUrl={url} />
      <StyledLink href={url} target="_blank" rel="noopener noreferrer">
        {name}
      </StyledLink>
    </StyledFileLine>
  );
};
