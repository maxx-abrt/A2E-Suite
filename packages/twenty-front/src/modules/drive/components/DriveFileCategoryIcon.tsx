import {
  IconFile,
  IconFileText,
  IconFileZip,
  IconPhoto,
  IconVideo,
} from 'twenty-ui/icon';

import { type AttachmentFileCategory } from '@/activities/files/types/AttachmentFileCategory';

// One icon per native file category, shared by the list and gallery so the two
// views cannot disagree about how a file is represented.
export const DriveFileCategoryIcon = ({
  category,
  size = 16,
}: {
  category: AttachmentFileCategory;
  size?: number;
}) => {
  switch (category) {
    case 'IMAGE':
      return <IconPhoto size={size} />;
    case 'VIDEO':
      return <IconVideo size={size} />;
    case 'ARCHIVE':
      return <IconFileZip size={size} />;
    case 'TEXT_DOCUMENT':
    case 'SPREADSHEET':
    case 'PRESENTATION':
      return <IconFileText size={size} />;
    default:
      return <IconFile size={size} />;
  }
};
