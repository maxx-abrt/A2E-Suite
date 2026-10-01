import { BureauLanding } from '@/bureau/components/BureauLanding';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledBureauPage = styled.main`
  background: ${themeCssVariables.background.primary};
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
`;

export const BureauPage = () => (
  <StyledBureauPage data-testid="bureau-page">
    <BureauLanding />
  </StyledBureauPage>
);
