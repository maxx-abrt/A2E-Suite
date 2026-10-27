import { A2E_SUITE_IDENTITY } from 'twenty-shared/constants';
import { type I18n } from '@lingui/core';
import { Container } from 'react-email';
import { Link } from 'src/components/Link';
import { ShadowText } from 'src/components/ShadowText';

type FooterProps = {
  i18n: I18n;
  homeUrl?: string;
};

export const Footer = ({ i18n, homeUrl }: FooterProps) => (
  <Container style={{ marginTop: '12px' }}>
    <ShadowText>
      <>
        {homeUrl && (
          <>
            <Link href={homeUrl} value={i18n._('Website')} /> ·{' '}
          </>
        )}
        <Link
          href="https://github.com/maxx-abrt/A2E-Suite"
          value={i18n._('Github')}
        />
        ·{' '}
        <Link
          href="https://github.com/maxx-abrt/A2E-Suite/tree/main/docs"
          value={i18n._('User guide')}
        />
      </>
    </ShadowText>
    <ShadowText>
      <>
        {A2E_SUITE_IDENTITY.operator.name}
        <br />
        {A2E_SUITE_IDENTITY.operator.address}
        <br />
        <Link
          href={`mailto:${A2E_SUITE_IDENTITY.operator.email}`}
          value={A2E_SUITE_IDENTITY.operator.email}
        />
      </>
    </ShadowText>
  </Container>
);
