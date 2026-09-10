// Legacy barrel kept for the earlier import path; all consumers should use
// the focused hooks (useCreateDocumentShare, useGuestDocumentShare).
export {
  useCreateDocumentShare,
  useDeleteDocumentShare,
} from '~/modules/document-share/hooks/useCreateDocumentShare';
export { useGuestDocumentShare } from '~/modules/document-share/hooks/useGuestDocumentShare';
