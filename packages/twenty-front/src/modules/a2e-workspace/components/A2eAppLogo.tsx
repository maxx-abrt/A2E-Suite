import { A2E_BRAND_LOGOS } from '@/a2e-workspace/constants/A2eBrandLogos';
import { styled } from '@linaria/react';
import { type IconComponent, type IconComponentProps } from 'twenty-ui/icon';

const StyledLogo = styled.img`
  display: block;
  flex-shrink: 0;
  object-fit: contain;
  user-select: none;
`;

type A2eAppLogoProps = Pick<
  IconComponentProps,
  'size' | 'className' | 'style'
> & {
  src: string;
};

export const A2eAppLogo = ({
  src,
  size = 24,
  className,
  style,
}: A2eAppLogoProps) => (
  <StyledLogo
    src={src}
    alt=""
    aria-hidden="true"
    draggable={false}
    width={typeof size === 'number' ? Math.max(size, 20) : size}
    height={typeof size === 'number' ? Math.max(size, 20) : size}
    className={className}
    style={style}
  />
);

export const IconA2eSuite: IconComponent = ({ size, className, style }) => (
  <A2eAppLogo
    size={size}
    className={className}
    style={style}
    src={A2E_BRAND_LOGOS.suite}
  />
);
export const IconBureau: IconComponent = ({ size, className, style }) => (
  <A2eAppLogo
    size={size}
    className={className}
    style={style}
    src={A2E_BRAND_LOGOS.bureau}
  />
);
export const IconBilan: IconComponent = ({ size, className, style }) => (
  <A2eAppLogo
    size={size}
    className={className}
    style={style}
    src={A2E_BRAND_LOGOS.bilan}
  />
);
export const IconAgenda: IconComponent = ({ size, className, style }) => (
  <A2eAppLogo
    size={size}
    className={className}
    style={style}
    src={A2E_BRAND_LOGOS.agenda}
  />
);
export const IconSyna: IconComponent = ({ size, className, style }) => (
  <A2eAppLogo
    size={size}
    className={className}
    style={style}
    src={A2E_BRAND_LOGOS.syna}
  />
);
