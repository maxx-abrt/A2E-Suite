import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { DriveFileCategoryIcon } from '@/drive/components/DriveFileCategoryIcon';
import {
  getDriveFileCategory,
  getDriveFileName,
} from '@/drive/utils/driveFileFilter';
import { type DriveFile } from '@/drive/types/DriveRecord';

// Fallback shown wherever a Drive file has no media preview (archives,
// office documents, unknown types). It reuses the shared category icon pair so
// list, gallery and preview never disagree about the file's representation.
const StyledFallback = styled.div<{ size: number }>`
  align-items: center;
  background: ${themeCssVariables.background.transparent.lighter};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  height: ${({ size }) => Math.max(size * 2, 24)}px;
  justify-content: center;
  width: ${({ size }) => Math.max(size * 2, 24)}px;
`;

export type DriveFilePreviewFallbackProps = {
  file: DriveFile;
  size?: number;
};

export const DriveFilePreviewFallback = ({
  file,
  size = 16,
}: DriveFilePreviewFallbackProps) => {
  const { t } = useLingui();
  const fileName = getDriveFileName(file);

  return (
    <StyledFallback
      size={size}
      role="img"
      aria-label={t`Preview not available for ${fileName}`}
      data-testid={`drive-file-preview-fallback-${file.id}`}
    >
      <DriveFileCategoryIcon
        category={getDriveFileCategory(file)}
        size={size}
      />
    </StyledFallback>
  );
};
