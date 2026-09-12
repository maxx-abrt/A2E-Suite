import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';

type GetLogoutRedirectUrlArgs = {
  landingPageUrl?: string | null;
};

export const getLogoutRedirectUrl = ({
  landingPageUrl,
}: GetLogoutRedirectUrlArgs) =>
  isNonEmptyString(landingPageUrl) && landingPageUrl.trim().length > 0
    ? landingPageUrl
    : AppPath.SignInUp;
