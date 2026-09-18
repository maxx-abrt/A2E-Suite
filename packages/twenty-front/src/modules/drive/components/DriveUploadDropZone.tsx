import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { type ReactNode, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { themeCssVariables } from 'twenty-ui/theme-constants';

// Drag-drop target for the Drive page. It deliberately owns no size limit:
// the queue validates size so an over-quota file still shows a specific
// message instead of being silently dropped. Clicking is disabled because the
// keyboard picker (`useFileUpload`) is the accessible alternative.
const StyledRoot = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  position: relative;
`;

const StyledOverlay = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.transparent.medium};
  border: 2px dashed ${themeCssVariables.border.color.strong};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  font-size: ${themeCssVariables.font.size.md};
  inset: ${themeCssVariables.spacing[2]};
  justify-content: center;
  pointer-events: none;
  position: absolute;
  z-index: 1;
`;

export type DriveUploadDropZoneProps = {
  onUploadFiles: (files: File[]) => void;
  children: ReactNode;
};

export const DriveUploadDropZone = ({
  onUploadFiles,
  children,
}: DriveUploadDropZoneProps) => {
  const { t } = useLingui();
  const [isDragActive, setIsDragActive] = useState(false);

  const { getRootProps } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDrop: () => setIsDragActive(false),
    onDropAccepted: (files) => {
      setIsDragActive(false);
      onUploadFiles(files);
    },
  });

  return (
    <StyledRoot
      // oxlint-disable-next-line react/jsx-props-no-spreading
      {...getRootProps()}
      data-testid="drive-upload-dropzone"
    >
      {isDragActive && <StyledOverlay>{t`Drop files to upload`}</StyledOverlay>}
      {children}
    </StyledRoot>
  );
};
