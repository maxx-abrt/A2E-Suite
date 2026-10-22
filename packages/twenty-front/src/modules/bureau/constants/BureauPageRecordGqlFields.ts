import { BUREAU_TREE_RECORD_GQL_FIELDS } from '@/bureau/constants/BureauTreeRecordGqlFields';

export const BUREAU_PAGE_RECORD_GQL_FIELDS = {
  ...BUREAU_TREE_RECORD_GQL_FIELDS,
  content: true,
  contentRevision: true,
  isFullWidth: true,
  isSmallText: true,
  isLocked: true,
};
