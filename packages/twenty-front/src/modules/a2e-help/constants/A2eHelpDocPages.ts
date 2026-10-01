import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// Canonical doc destinations for in-app help. Slugs mirror
// `packages/twenty-docs/navigation/base-structure.json` under the `a2eSuite`
// group (and its `l/fr` mirror), so a missing page is a docs-nav change, never
// a guessed URL. The docs site canonicalises to `https://docs.twenty.com`.
export const A2E_HELP_DOCS_BASE_URL = 'https://docs.twenty.com';

export type A2eHelpAppKey = 'bureau' | 'agenda' | 'bilan' | 'syna' | 'archive';

export type A2eHelpDocPageKey =
  | A2eHelpAppKey
  | 'gettingStarted'
  | 'templates'
  | 'workingAcrossApps'
  | 'faqTroubleshooting';

export type A2eHelpDocPage = {
  key: A2eHelpDocPageKey;
  slug: string;
  label: MessageDescriptor;
};

export const A2E_HELP_DOC_PAGES: Record<A2eHelpDocPageKey, A2eHelpDocPage> = {
  gettingStarted: {
    key: 'gettingStarted',
    slug: 'user-guide/a2e-suite/getting-started',
    label: msg`Getting started`,
  },
  bureau: {
    key: 'bureau',
    slug: 'user-guide/a2e-suite/bureau',
    label: msg`Bureau`,
  },
  agenda: {
    key: 'agenda',
    slug: 'user-guide/a2e-suite/agenda',
    label: msg`Agenda`,
  },
  bilan: {
    key: 'bilan',
    slug: 'user-guide/a2e-suite/bilan',
    label: msg`Bilan`,
  },
  syna: {
    key: 'syna',
    slug: 'user-guide/a2e-suite/syna',
    label: msg`Syna`,
  },
  archive: {
    key: 'archive',
    slug: 'user-guide/a2e-suite/archive',
    label: msg`Archive`,
  },
  templates: {
    key: 'templates',
    slug: 'user-guide/a2e-suite/templates',
    label: msg`Templates`,
  },
  workingAcrossApps: {
    key: 'workingAcrossApps',
    slug: 'user-guide/a2e-suite/working-across-apps',
    label: msg`Working across apps`,
  },
  faqTroubleshooting: {
    key: 'faqTroubleshooting',
    slug: 'user-guide/a2e-suite/faq-troubleshooting',
    label: msg`FAQ & troubleshooting`,
  },
};

export const getA2eHelpDocUrl = (key: A2eHelpDocPageKey): string =>
  `${A2E_HELP_DOCS_BASE_URL}/${A2E_HELP_DOC_PAGES[key].slug}`;
