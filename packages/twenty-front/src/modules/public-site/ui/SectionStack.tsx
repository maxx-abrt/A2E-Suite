import { styled } from '@linaria/react';

import { mediaUp, spacing } from '@/public-site/tokens';

// The gap between a section's intro and its content block: one value pair
// across the site (Problem, ThreeCards, FAQ, and onward).
const StyledSectionStack = styled.div`
  display: grid;
  grid-template-columns: 1fr;

  & > * + * {
    margin-top: ${spacing(10)};
  }

  ${mediaUp('md')} {
    & > * + * {
      margin-top: ${spacing(20)};
    }
  }
`;

export { StyledSectionStack as SectionStack };
