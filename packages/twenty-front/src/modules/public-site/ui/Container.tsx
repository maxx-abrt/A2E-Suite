import { styled } from '@linaria/react';

import {
  GUTTER,
  MAX_CONTENT_WIDTH_PX,
  mediaUp,
  spacing,
} from '@/public-site/tokens';

// Owns the page's horizontal gutter and max content width. SectionShell is
// the standard consumer; page chrome (menu, footer) composes it directly.

// Owns the page's horizontal frame: max content width plus the only
// horizontal gutter on the site. Sections never set their own.
const StyledContainer = styled.div`
  margin-inline: auto;
  max-width: ${MAX_CONTENT_WIDTH_PX}px;
  padding-inline: ${spacing(GUTTER.base)};
  width: 100%;

  ${mediaUp('md')} {
    padding-inline: ${spacing(GUTTER.md)};
  }

  &[data-flush-inline] {
    padding-inline: 0;
  }
`;

export { StyledContainer as Container };
