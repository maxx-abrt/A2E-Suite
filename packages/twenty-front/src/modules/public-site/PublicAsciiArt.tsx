import { PUBLIC_ASCII_FRAMES } from '@/public-site/art/PublicAsciiFrames';
import { color, fontFamily } from '@/public-site/tokens';
import { styled } from '@linaria/react';
import { type CSSProperties } from 'react';

const StyledArt = styled.div`
  align-items: center;
  color: inherit;
  container-type: size;
  display: flex;
  height: 100%;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  width: 100%;
  pre {
    animation: public-ascii-float 10s ease-in-out infinite alternate;
    animation-play-state: paused;
    flex-shrink: 0;
    font-family: ${fontFamily('mono')};
    font-size: min(
      8px,
      calc(90cqw / var(--ascii-width)),
      calc(82cqh / var(--ascii-height))
    );
    font-variant-ligatures: none;
    font-weight: 400;
    letter-spacing: 0;
    line-height: 1;
    margin: 0;
    user-select: none;
    white-space: pre;
  }
  &[data-in-view='true'] pre {
    animation-play-state: running;
  }
  &[data-subdued='true'] {
    color: ${color('blue')};
    opacity: 0.22;
    pre {
      font-size: min(
        32px,
        calc(100cqw / var(--ascii-width)),
        calc(100cqh / var(--ascii-height))
      );
    }
  }
  @keyframes public-ascii-float {
    from {
      transform: translateY(3px);
    }
    to {
      transform: translateY(-3px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    pre {
      animation: none;
    }
  }
`;

type PublicAsciiArtProps = {
  variant: keyof typeof PUBLIC_ASCII_FRAMES;
  subdued?: boolean;
};

export const PublicAsciiArt = ({
  variant,
  subdued = false,
}: PublicAsciiArtProps) => {
  const frame = PUBLIC_ASCII_FRAMES[variant];
  const rows = frame.split('\n');
  return (
    <StyledArt
      aria-hidden="true"
      data-art={variant}
      data-public-motion=""
      data-subdued={subdued || undefined}
      style={
        {
          '--ascii-width': rows[0].length * 0.6,
          '--ascii-height': rows.length,
        } as CSSProperties
      }
    >
      <pre>{frame}</pre>
    </StyledArt>
  );
};
