import {
  IconAgenda,
  IconBilan,
  IconBureau,
  IconSyna,
} from '@/a2e-workspace/components/A2eAppLogo';
import { IconFolder, type IconComponent } from 'twenty-ui/icon';
import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

// The five-app suite catalogue (D-N1 naming, packages/twenty-apps/README-A2E.md:
// Bureau · Agenda · Bilan · Syna · Archive). "Start from scratch" installs
// nothing, so this is the only place a new user sees what the suite offers and
// how to add it later. Descriptions reuse the shipped per-app doc copy
// (twenty-docs/user-guide/a2e-suite/<app>.mdx front matter) — the drift spec in
// __tests__ reads those files, so the catalogue can never invent a promise the
// docs do not already make.
export type OnboardingAppCatalogueEntry = {
  key: 'bureau' | 'agenda' | 'bilan' | 'syna' | 'archive';
  Icon: IconComponent;
  label: MessageDescriptor;
  description: MessageDescriptor;
};

export const ONBOARDING_APP_CATALOGUE: OnboardingAppCatalogueEntry[] = [
  {
    key: 'bureau',
    Icon: IconBureau,
    label: msg`Bureau`,
    description: msg`The work and knowledge experience — documents, projects, tasks and discussions.`,
  },
  {
    key: 'agenda',
    Icon: IconAgenda,
    label: msg`Agenda`,
    description: msg`Calendar events, recurrence, reminders and task deadlines.`,
  },
  {
    key: 'bilan',
    Icon: IconBilan,
    label: msg`Bilan`,
    description: msg`Quotes, invoices, ledger, fiches and funding for associations and small businesses.`,
  },
  {
    key: 'syna',
    Icon: IconSyna,
    label: msg`Syna`,
    description: msg`The AI assistant — bring-your-own-key, chat, tools and zero-AI mode.`,
  },
  {
    key: 'archive',
    Icon: IconFolder,
    label: msg`Archive`,
    description: msg`Drive folders, file upload, previews, sharing and storage usage.`,
  },
];
