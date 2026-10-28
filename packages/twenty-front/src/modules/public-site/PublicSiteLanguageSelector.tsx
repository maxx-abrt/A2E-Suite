import { semanticColor } from '@/public-site/tokens';
import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

const StyledLanguage = styled.div`
  color: ${semanticColor.ink};
  font-size: 12px;
  select {
    background: ${semanticColor.surface};
    border: 1px solid ${semanticColor.lineStrong};
    border-radius: 8px;
    color: inherit;
    cursor: pointer;
    font: inherit;
    max-width: 100%;
    min-height: 40px;
    padding: 8px;
  }
  p {
    max-width: 220px;
  }
`;

export const PublicSiteLanguageSelector = () => {
  const { t, i18n } = useLingui();
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Route changes must cancel a pending selection before it can activate or navigate.
  // oxlint-disable-next-line twenty/no-state-useref
  const activationVersion = useRef(0);
  useEffect(
    () => () => {
      activationVersion.current += 1;
    },
    [pathname, search, hash],
  );
  const urlLocale = new URLSearchParams(search).get('locale');

  useEffect(() => {
    if (urlLocale !== 'en' && urlLocale !== 'fr-FR' && urlLocale !== 'fr') {
      setIsLoading(false);
      return;
    }
    const locale = urlLocale === 'fr' ? 'fr-FR' : urlLocale;
    if (i18n.locale === locale) {
      setIsLoading(false);
      return;
    }
    let isCurrent = true;
    setIsLoading(true);
    setHasError(false);
    void dynamicActivate(locale, { canActivate: () => isCurrent }).then(
      (activatedLocale) => {
        if (!isCurrent) return;
        setIsLoading(false);
        setHasError(activatedLocale !== locale);
        if (activatedLocale !== locale) return;
        try {
          localStorage.setItem('locale', locale);
        } catch {
          // Language switching remains available when browser storage is blocked.
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [urlLocale, i18n, pathname, search, hash]);

  const handleChange = async (locale: string) => {
    if (locale !== 'en' && locale !== 'fr-FR') return;
    setIsLoading(true);
    setHasError(false);
    const version = activationVersion.current;
    const isCurrent = () => activationVersion.current === version;
    const activatedLocale = await dynamicActivate(locale, {
      canActivate: isCurrent,
    });
    if (!isCurrent()) return;
    setIsLoading(false);
    if (activatedLocale !== locale) {
      setHasError(true);
      return;
    }
    try {
      localStorage.setItem('locale', locale);
    } catch {
      // Language switching remains available when browser storage is blocked.
    }
    const parameters = new URLSearchParams(search);
    parameters.set('locale', locale);
    navigate({ pathname, search: `?${parameters}`, hash }, { replace: true });
  };

  return (
    <StyledLanguage>
      <select
        aria-label={t`Language`}
        aria-busy={isLoading}
        disabled={isLoading}
        value={i18n.locale}
        onChange={(event) => void handleChange(event.target.value)}
      >
        {i18n.locale !== 'en' && i18n.locale !== 'fr-FR' && (
          <option value={i18n.locale}>{i18n.locale}</option>
        )}
        <option value="en" lang="en">
          English
        </option>
        <option value="fr-FR" lang="fr">
          Français
        </option>
      </select>
      {hasError && (
        <p role="status">{t`Translations could not be loaded. Please try again.`}</p>
      )}
    </StyledLanguage>
  );
};
