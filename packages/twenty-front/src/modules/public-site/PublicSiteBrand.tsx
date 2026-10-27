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
    <svg
      aria-hidden="true"
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="currentColor"
    >
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((column) => (
          <rect
            key={`${row}-${column}`}
            x={3 + column * 9}
            y={3 + row * 9}
            width="6"
            height="6"
            rx="1"
            opacity={column === 2 ? 0.3 : 1}
          />
        )),
      )}
    </svg>
    A2E Suite
  </StyledBrand>
);
