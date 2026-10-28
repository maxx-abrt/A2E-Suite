import { useLingui } from '@lingui/react/macro';
import { Link, parsePath, type LinkProps } from 'react-router-dom';

type PublicSiteLinkProps = Pick<
  LinkProps,
  'to' | 'children' | 'className' | 'onClick' | 'aria-label' | 'aria-current'
> & {
  'data-size'?: string;
  'data-variant'?: string;
};

export const PublicSiteLink = ({
  to,
  children,
  className,
  onClick,
  'aria-label': ariaLabel,
  'aria-current': ariaCurrent,
  'data-size': dataSize,
  'data-variant': dataVariant,
}: PublicSiteLinkProps) => {
  const { i18n } = useLingui();
  const destination = typeof to === 'string' ? parsePath(to) : to;
  const parameters = new URLSearchParams(destination.search);
  parameters.set('locale', i18n.locale);

  return (
    <Link
      to={{ ...destination, search: `?${parameters}` }}
      className={className}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      data-size={dataSize}
      data-variant={dataVariant}
    >
      {children}
    </Link>
  );
};
