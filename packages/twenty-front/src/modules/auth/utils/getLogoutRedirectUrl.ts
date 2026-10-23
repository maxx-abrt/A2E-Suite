import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';

type GetLogoutRedirectUrlArgs = {
  landingPageUrl?: string | null;
  workspaceAgnosticSignInUrl?: string;
};

export const getLogoutRedirectUrl = ({
  landingPageUrl,
  workspaceAgnosticSignInUrl,
}: GetLogoutRedirectUrlArgs) =>
  workspaceAgnosticSignInUrl ??
  (isNonEmptyString(landingPageUrl) && landingPageUrl.trim().length > 0
    ? landingPageUrl
    : AppPath.SignInUp);
