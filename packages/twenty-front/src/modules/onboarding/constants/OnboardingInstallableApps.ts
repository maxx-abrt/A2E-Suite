import { type OnboardingInstallableApp } from '@/onboarding/types/OnboardingInstallableApp';
import { msg } from '@lingui/core/macro';

export const ONBOARDING_INSTALLABLE_APPS: OnboardingInstallableApp[] = [
  {
    universalIdentifier: '19126a9c-7cc0-4368-aaba-c7e5a87b0c48',
    label: msg`Bureau`,
    description: msg`Notes, docs and knowledge base`,
  },
  {
    universalIdentifier: '4f759655-84f8-434d-9c76-ee1850e8c1a4',
    label: msg`Projects`,
    description: msg`Project boards, tasks, subtasks and time tracking`,
  },
  {
    universalIdentifier: 'b11a0000-0000-4000-8000-000000000001',
    label: msg`Bilan`,
    description: msg`Invoicing, bookkeeping, budgets and funding`,
  },
  {
    universalIdentifier: 'e2dce399-87f1-4548-b307-5f368b4d5dd4',
    label: msg`Chat`,
    description: msg`Workspace channels, threads, reactions and read cursors`,
  },
  {
    universalIdentifier: 'b11cd01f-75de-4acd-8e67-0e9c484fde02',
    label: msg`Drive`,
    description: msg`File browser with folders, preview and bulk actions`,
  },
  {
    universalIdentifier: '8da4b8b5-5edf-4880-b51f-ab6e679ec617',
    label: msg`Call recorder`,
    description: msg`Record your calls and get transcripts`,
  },
  {
    universalIdentifier: '4a1178c1-3535-4a47-b592-231d3216b36f',
    label: msg`Enrichment`,
    description: msg`Enrich your leads with People Data Labs`,
  },
  {
    universalIdentifier: '66a504cc-0a75-410e-a43f-cdeae1db1522',
    label: msg`Last contact`,
    description: msg`Get last contact date with relations`,
  },
];
