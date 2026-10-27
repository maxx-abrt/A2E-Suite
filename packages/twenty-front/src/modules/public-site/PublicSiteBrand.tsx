import { IconA2eSuite } from '@/a2e-workspace/components/A2eAppLogo';
import { styled } from '@linaria/react';

const StyledBrand = styled.span`
  align-items: center;
  display: inline-flex;
  font-size: 18px;
  font-weight: 500;
  gap: 12px;
  white-space: nowrap;
`;

export const PublicSiteBrand = () => (
  <StyledBrand>
    <IconA2eSuite size={40} />
    A2E Suite
  </StyledBrand>
);
