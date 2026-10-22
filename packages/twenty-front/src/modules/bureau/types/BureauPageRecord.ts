import { type BureauDocument } from '@/bureau/types/BureauDocument';

// The open page: tree fields plus the rich-text body and reading controls.
export type BureauPageRecord = BureauDocument & {
  content: { blocknote: string | null; markdown: string | null } | null;
  contentRevision: string | null;
  isFullWidth: boolean | null;
  isSmallText: boolean | null;
  isLocked: boolean | null;
};
