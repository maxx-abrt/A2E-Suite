import { useIsLogged } from '@/auth/hooks/useIsLogged';
import { useIsCurrentLocationOnDefaultDomain } from '@/domain-manager/hooks/useIsCurrentLocationOnDefaultDomain';
import { PublicSite } from '@/public-site/PublicSite';
import { Navigate, useLocation } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';

export const PublicLandingPage = () => {
  const isLogged = useIsLogged();
  const { isDefaultDomain } = useIsCurrentLocationOnDefaultDomain();
  const { pathname } = useLocation();

  if ((isLogged && pathname === AppPath.Index) || !isDefaultDomain) {
    return <Navigate to={AppPath.SignInUp} replace />;
  }

  return <PublicSite />;
};
