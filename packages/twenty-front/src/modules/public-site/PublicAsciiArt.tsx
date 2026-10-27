import { PUBLIC_ASCII_FRAMES } from '@/public-site/art/PublicAsciiFrames';
import { color, fontFamily } from '@/public-site/tokens';
import { styled } from '@linaria/react';

const StyledArt = styled.div`
  align-items: center;
  color: ${color('blue')};
  display: flex;
  height: 100%;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  width: 100%;
  pre {
    animation: public-ascii-float 14s ease-in-out infinite alternate;
    animation-play-state: paused;
    flex-shrink: 0;
    font-family: ${fontFamily('mono')};
    font-size: 8px;
    font-variant-ligatures: none;
    font-weight: 400;
    line-height: 9px;
    margin: 0;
    user-select: none;
    white-space: pre;
  }
  &[data-in-view='true'] pre {
    animation-play-state: running;
  }
  &[data-art='bridge'] {
    mask-image: linear-gradient(
      to bottom,
      transparent,
      ${color('black')} 18%,
      ${color('black')} 75%,
      transparent
    );
    pre {
      font-size: clamp(8px, 0.8vw, 13px);
      line-height: 1;
      opacity: 0.65;
    }
  }
  @keyframes public-ascii-float {
    from {
      transform: translateY(5px) rotate(-1deg);
    }
    to {
      transform: translateY(-5px) rotate(1deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    pre {
      animation: none;
    }
  }
`;

type PublicAsciiArtProps = { variant: keyof typeof PUBLIC_ASCII_FRAMES };

export const PublicAsciiArt = ({ variant }: PublicAsciiArtProps) => (
  <StyledArt aria-hidden="true" data-art={variant} data-public-motion="">
    <pre>{PUBLIC_ASCII_FRAMES[variant]}</pre>
  </StyledArt>
);
