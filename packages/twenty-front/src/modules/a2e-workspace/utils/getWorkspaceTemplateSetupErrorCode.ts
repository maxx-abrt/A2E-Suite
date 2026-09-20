import { type ApplyTemplateErrorCode } from '@/a2e-workspace/types/apply-template-operation.types';
import { isDefined } from 'twenty-shared/utils';
import { isGraphqlErrorOfType } from '~/utils/is-graphql-error-of-type.util';

// One classifier for preview and apply so the three C2 failure kinds stay
// distinct: the server's own discriminator wins when present, a FORBIDDEN
// answer is a permission denial, and anything else is a network failure.
export const getWorkspaceTemplateSetupErrorCode = ({
  previewErrorCode,
  error,
}: {
  previewErrorCode?: ApplyTemplateErrorCode | null;
  error?: unknown;
}): ApplyTemplateErrorCode | null => {
  if (isDefined(previewErrorCode)) {
    return previewErrorCode;
  }

  if (!isDefined(error)) {
    return null;
  }

  return isGraphqlErrorOfType(error, 'FORBIDDEN')
    ? 'PERMISSION_DENIED'
    : 'NETWORK_ERROR';
};
