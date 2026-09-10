import { useLingui } from '@lingui/react/macro';
import { styled } from '@linaria/react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { isDefined } from 'twenty-shared/utils';
import { IconLockOpen } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useGuestDocumentShare } from '~/modules/document-share/hooks/useGuestDocumentShare';
import { decryptShareBody } from '~/modules/document-share/utils/deriveShareAesGcmKey';

const StyledPage = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};
`;

const StyledArticle = styled.article`
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.6;
  max-width: 720px;
  width: 100%;

  h1,
  h2,
  h3 {
    margin: ${themeCssVariables.spacing[5]} 0 ${themeCssVariables.spacing[2]};
  }

  p {
    margin: ${themeCssVariables.spacing[2]} 0;
  }

  ul,
  ol {
    padding-left: ${themeCssVariables.spacing[4]};
  }
`;

const StyledTitle = styled.h1`
  font-size: ${themeCssVariables.font.size.xl};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-bottom: ${themeCssVariables.spacing[4]};
`;

const StyledPassphraseForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-top: ${themeCssVariables.spacing[8]};
  max-width: 320px;
  width: 100%;
`;

const StyledPassphraseInput = styled.input`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.md};
  padding: ${themeCssVariables.spacing[2]};
`;

const StyledMessage = styled.p`
  color: ${themeCssVariables.font.color.secondary};
  margin-top: ${themeCssVariables.spacing[8]};
`;

// Read-only guest surface for a shared document snapshot. The token is the
// only credential; passphrase-protected shares are decrypted entirely in the
// browser — the passphrase is never transmitted.
export const DocumentShareGuestPage = () => {
  const { t } = useLingui();
  const { shareToken } = useParams<{ shareToken: string }>();
  const { guestShare, guestShareLoading, guestShareError } =
    useGuestDocumentShare(shareToken ?? '');

  const [passphrase, setPassphrase] = useState('');
  const [decryptedBody, setDecryptedBody] = useState<string | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const handleUnlock = async () => {
    if (
      !isDefined(guestShare) ||
      !isDefined(guestShare.encryptedBody) ||
      !isDefined(guestShare.bodyIv) ||
      !isDefined(guestShare.bodySalt)
    ) {
      return;
    }

    try {
      setDecryptedBody(
        await decryptShareBody(
          guestShare.encryptedBody,
          guestShare.bodyIv,
          passphrase,
          guestShare.bodySalt,
        ),
      );
      setDecryptionError(null);
    } catch {
      // GCM auth failure = wrong passphrase (that IS the verification).
      setDecryptionError(t`Wrong passphrase`);
    }
  };

  const markdownBody = useMemo(() => {
    if (isDefined(decryptedBody)) {
      return decryptedBody;
    }

    return guestShare?.bodySnapshot ?? null;
  }, [decryptedBody, guestShare?.bodySnapshot]);

  if (guestShareLoading) {
    return <StyledPage>{t`Loading…`}</StyledPage>;
  }

  if (isDefined(guestShareError) || !isDefined(guestShare)) {
    return (
      <StyledPage>
        <StyledMessage>
          {t`This share link is invalid, expired or has been revoked.`}
        </StyledMessage>
      </StyledPage>
    );
  }

  const needsPassphrase =
    guestShare.isPassphraseProtected && !isDefined(decryptedBody);

  return (
    <StyledPage>
      {needsPassphrase ? (
        <StyledPassphraseForm
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            void handleUnlock();
          }}
        >
          <StyledPassphraseInput
            type="password"
            value={passphrase}
            onChange={(inputEvent) => setPassphrase(inputEvent.target.value)}
            placeholder={t`Passphrase`}
          />
          {isDefined(decryptionError) && (
            <StyledMessage>{decryptionError}</StyledMessage>
          )}
          <Button
            title={t`Unlock`}
            Icon={IconLockOpen}
            variant="primary"
            accent="blue"
            type="submit"
          />
        </StyledPassphraseForm>
      ) : (
        <StyledArticle>
          <StyledTitle>{guestShare.titleSnapshot}</StyledTitle>
          {isDefined(markdownBody) ? (
            <ReactMarkdown>{markdownBody}</ReactMarkdown>
          ) : (
            <StyledMessage>{t`This document is empty.`}</StyledMessage>
          )}
        </StyledArticle>
      )}
    </StyledPage>
  );
};
