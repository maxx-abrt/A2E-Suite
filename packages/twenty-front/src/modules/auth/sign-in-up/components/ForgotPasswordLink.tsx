import { useState } from 'react';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';

import { useHandleResetPassword } from '@/auth/sign-in-up/hooks/useHandleResetPassword';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  text-align: center;

  button {
    background: none;
    border: none;
    color: ${themeCssVariables.font.color.primary};
    cursor: pointer;
    font: inherit;
    padding: ${themeCssVariables.spacing[2]};
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  button:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

type ForgotPasswordLinkProps = { email: string };

export const ForgotPasswordLink = ({ email }: ForgotPasswordLinkProps) => {
  const { t } = useLingui();
  const { handleResetPassword, isSendingResetLink } = useHandleResetPassword();
  const [isSent, setIsSent] = useState(false);

  return (
    <StyledContainer>
      <button
        type="button"
        disabled={isSendingResetLink || isSent}
        onClick={async () => {
          if (await handleResetPassword(email)()) setIsSent(true);
        }}
      >
        {isSent
          ? t`Check your inbox`
          : isSendingResetLink
            ? t`Sending reset link…`
            : t`Forgot your password?`}
      </button>
      {isSent && (
        <p role="status">{t`If this email is registered, a password reset link has been sent. Check your spam folder too.`}</p>
      )}
    </StyledContainer>
  );
};
