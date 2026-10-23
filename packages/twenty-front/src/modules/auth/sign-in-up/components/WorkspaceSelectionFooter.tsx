import { useAuth } from '@/auth/hooks/useAuth';
import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { useState } from 'react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledAccountButton = styled.button`
  background: transparent;
  border: 0;
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font: inherit;
  padding: ${themeCssVariables.spacing[2]};
  text-decoration: underline;
  text-underline-offset: 3px;

  &:focus-visible {
    outline: 2px solid ${themeCssVariables.font.color.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`;

export const WorkspaceSelectionFooter = () => {
  const { signOut } = useAuth();
  const { t } = useLingui();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <StyledAccountButton
      type="button"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        try {
          await signOut();
        } finally {
          setIsSigningOut(false);
        }
      }}
    >
      {isSigningOut ? t`Signing out…` : t`Use another account`}
    </StyledAccountButton>
  );
};
