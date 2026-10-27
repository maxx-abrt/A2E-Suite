import { PUBLIC_LEGAL_PAGES } from '@/public-site/PublicLegalPages';
import { msg } from '@lingui/core/macro';

export const PUBLIC_SITE_PAGES = [
  { id: 'product', path: '/product', label: msg`Product` },
  { id: 'apps', path: '/apps', label: msg`Applications` },
  { id: 'use-cases', path: '/use-cases', label: msg`Use cases` },
  { id: 'why-a2e', path: '/why-a2e', label: msg`Why A2E` },
  {
    id: 'getting-started',
    path: '/getting-started',
    label: msg`Getting started`,
  },
] as const;

export const PUBLIC_SITE_ROUTES = [
  ...PUBLIC_SITE_PAGES,
  ...PUBLIC_LEGAL_PAGES,
  ...['bureau', 'agenda', 'bilan', 'archive', 'crm', 'syna'].map(
    (applicationId) => ({
      id: `app-${applicationId}`,
      path: `/apps/${applicationId}`,
    }),
  ),
];

export const isPublicSitePath = (pathname: string) =>
  pathname === '/' ||
  PUBLIC_SITE_ROUTES.some((page) => page.path === pathname.replace(/\/$/, ''));
