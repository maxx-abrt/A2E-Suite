import { createReactBlockSpec } from '@blocknote/react';
import { styled } from '@linaria/react';
import { isNonEmptyString } from '@sniptt/guards';
import { type ChangeEvent, useRef } from 'react';
import { isUndefinedOrNull } from '~/utils/isUndefinedOrNull';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';
import { getFileType } from '@/activities/files/utils/getFileType';
import { FileIcon } from '@/file/components/FileIcon';
import { getFileEmbedKind } from '@/blocknote-editor/utils/getFileEmbedKind';
import { t } from '@lingui/core/macro';
import { getSafeUrl, isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';

const StyledFileInput = styled.input`
  display: none;
`;

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

const StyledUploadFileContainer = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
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

export const FileBlock = createReactBlockSpec(
  {
    type: 'file',
    propSchema: {
      url: {
        default: '',
      },
      name: {
        default: '',
      },
      fileCategory: {
        default: 'OTHER' as AttachmentFileCategory,
      },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      // oxlint-disable-next-line react-hooks/rules-of-hooks
      const inputFileRef = useRef<HTMLInputElement>(null);

      const handleUploadAttachment = async (file: File) => {
        if (isUndefinedOrNull(file)) {
          return '';
        }
        const fileUrl = await editor.uploadFile?.(file);

        if (!isNonEmptyString(fileUrl)) {
          return '';
        }

        editor.updateBlock(block.id, {
          props: {
            ...block.props,
            url: fileUrl,
            fileCategory: getFileType(file.name),
            name: file.name,
          },
        });
      };
      const handleUploadFileClick = () => {
        inputFileRef?.current?.click?.();
      };
      const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (isDefined(e.target.files))
          handleUploadAttachment?.(e.target.files[0]);
      };

      const safeUrl = getSafeUrl(block.props.url);

      if (safeUrl) {
        // Media the browser can play inline is embedded; documents, PDF and
        // archives stay a download link so a page never inlines arbitrary HTML.
        const embedKind = getFileEmbedKind(
          block.props.fileCategory as AttachmentFileCategory,
        );

        if (embedKind === 'image') {
          return (
            <StyledEmbedImage
              src={safeUrl}
              alt={block.props.name}
              contentEditable={false}
            />
          );
        }

        if (embedKind === 'video') {
          return (
            <StyledEmbedVideo src={safeUrl} controls contentEditable={false} />
          );
        }

        if (embedKind === 'audio') {
          return (
            <StyledEmbedAudio src={safeUrl} controls contentEditable={false} />
          );
        }

        return (
          <StyledFileLine>
            <FileIcon
              fileCategory={block.props.fileCategory as AttachmentFileCategory}
              thumbnailUrl={safeUrl}
            />
            <StyledLink
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {block.props.name}
            </StyledLink>
          </StyledFileLine>
        );
      }

      return (
        <StyledUploadFileContainer>
          <StyledFileInput
            ref={inputFileRef}
            onChange={handleFileChange}
            type="file"
          />
          <Button
            onClick={handleUploadFileClick}
            title={t`Upload File`}
          ></Button>
        </StyledUploadFileContainer>
      );
    },
  },
);
