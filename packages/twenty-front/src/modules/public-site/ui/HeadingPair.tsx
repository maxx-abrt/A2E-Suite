import { styled } from '@linaria/react';

import { spacing } from '@/public-site/tokens';

// A heading and its supporting body, paired at one gap everywhere — the
// hero and section intros compose this instead of choosing their own.
const StyledHeadingPair = styled.div`
  display: grid;
  grid-template-columns: 1fr;

  & > * + * {
    margin-top: ${spacing(3)};
  }
`;

export { StyledHeadingPair as HeadingPair };
