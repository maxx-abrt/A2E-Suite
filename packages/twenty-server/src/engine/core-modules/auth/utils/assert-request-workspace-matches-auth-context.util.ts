import { type Request } from 'express';
import { WORKSPACE_REQUEST_HEADER } from 'twenty-shared/constants';
import { isDefined } from 'twenty-shared/utils';

import {
  AuthException,
  AuthExceptionCode,
} from 'src/engine/core-modules/auth/auth.exception';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';

export const assertRequestWorkspaceMatchesAuthContext = (
  request: Pick<Request, 'headers'>,
  context: AuthContext,
): void => {
  const requestedWorkspaceId = request.headers[WORKSPACE_REQUEST_HEADER];

  // Legacy clients omit the assertion; a selector never expands a credential's grants.
  if (!isDefined(requestedWorkspaceId)) {
    return;
  }

  if (
    typeof requestedWorkspaceId !== 'string' ||
    requestedWorkspaceId.length === 0 ||
    requestedWorkspaceId !== context.workspace?.id
  ) {
    throw new AuthException(
      'Request workspace does not match the authenticated workspace',
      AuthExceptionCode.WORKSPACE_CONTEXT_MISMATCH,
    );
  }
};
