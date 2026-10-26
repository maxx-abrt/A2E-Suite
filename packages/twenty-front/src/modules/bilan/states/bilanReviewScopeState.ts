import { type BilanReviewScope } from '@/bilan/utils/buildBilanReviewView';
import { createAtomFamilyState } from '@/ui/utilities/state/jotai/utils/createAtomFamilyState';

export const bilanReviewScopeState = createAtomFamilyState<
  BilanReviewScope,
  { objectMetadataId: string; workspaceMemberId: string }
>({
  key: 'bilanReviewScopeState',
  defaultValue: 'details',
  useLocalStorage: true,
});
