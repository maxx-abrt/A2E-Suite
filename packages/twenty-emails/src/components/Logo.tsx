import { Img, Text } from 'react-email';

type LogoProps = { logoUrl?: string };

export const Logo = ({ logoUrl }: LogoProps) => (
  <>
    {logoUrl && <Img src={logoUrl} alt="" width="48" height="48" />}
    <Text style={{ fontSize: '18px', fontWeight: 600, marginBottom: '40px' }}>
      A2E Suite
    </Text>
  </>
);
