import { A2E_SUITE_IDENTITY } from 'twenty-shared/constants';
import { getEmailBranding } from 'src/utils/get-email-branding';
import { type JSX } from 'react';
import { I18nProvider } from '@lingui/react';
import { Container, Html } from 'react-email';

import { BaseHead } from 'src/components/BaseHead';
import { Footer } from 'src/components/Footer';
import { Logo } from 'src/components/Logo';
import { createI18nInstance } from 'src/utils/i18n.utils';
import { type APP_LOCALES } from 'twenty-shared/translations';

type BaseEmailProps = {
  children: JSX.Element | JSX.Element[] | string;
  width?: number;
  locale: keyof typeof APP_LOCALES;
  publicUrl?: string;
};

export const BaseEmail = ({
  children,
  width,
  locale,
  publicUrl,
}: BaseEmailProps) => {
  const i18nInstance = createI18nInstance(locale);
  const { homeUrl, logoUrl } = getEmailBranding(
    publicUrl ?? A2E_SUITE_IDENTITY.publicUrl,
  );

  return (
    <I18nProvider i18n={i18nInstance}>
      <Html lang={locale}>
        <BaseHead />
        <Container width={width || 290}>
          <Logo logoUrl={logoUrl} />
          {children}
          <Footer i18n={i18nInstance} homeUrl={homeUrl} />
        </Container>
      </Html>
    </I18nProvider>
  );
};
