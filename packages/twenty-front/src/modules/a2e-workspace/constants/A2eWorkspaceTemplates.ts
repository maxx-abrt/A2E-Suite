import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import {
  IconBook,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconHeart,
  IconUser,
  IconUsers,
  type IconComponent,
} from 'twenty-ui/icon';

// Mirrors the server-side WorkspaceTemplate enum
// (engine/core-modules/onboarding/enums/workspace-template.enum.ts); kept as
// string literals so the front does not depend on server codegen for it.
export type A2eWorkspaceTemplate =
  | 'CRM'
  | 'INDIVIDUAL'
  | 'STUDENT'
  | 'TEAM'
  | 'NON_PROFIT'
  | 'SMALL_BUSINESS';

// Descriptions state what each preset really does today, using the product
// names of the onboarding app list (Bureau = a2e-documents, Bilan =
// a2e-accounting): every installed app is named, no uninstalled app is
// implied, and CRM-off presets say so. The truthfulness spec in __tests__
// derives this from the server's WORKSPACE_TEMPLATE_DEFINITIONS (M2 f / G4).
export type A2eWorkspaceTemplateOption = {
  value: A2eWorkspaceTemplate;
  label: MessageDescriptor;
  description: MessageDescriptor;
  Icon: IconComponent;
};

export const A2E_WORKSPACE_TEMPLATE_OPTIONS: A2eWorkspaceTemplateOption[] = [
  {
    value: 'CRM',
    label: msg`CRM`,
    description: msg`Classic sales workspace: companies, people and opportunities`,
    Icon: IconBuildingSkyscraper,
  },
  {
    value: 'INDIVIDUAL',
    label: msg`Individual`,
    description: msg`Personal workspace with Bureau notes and docs; CRM navigation hidden`,
    Icon: IconUser,
  },
  {
    value: 'STUDENT',
    label: msg`Student`,
    description: msg`Bureau notes and docs for your courses; CRM navigation hidden`,
    Icon: IconBook,
  },
  {
    value: 'TEAM',
    label: msg`Team`,
    description: msg`Shared Bureau notes and docs alongside the CRM`,
    Icon: IconUsers,
  },
  {
    value: 'NON_PROFIT',
    label: msg`Non-profit`,
    description: msg`CRM with Bureau docs and Bilan budgets and funding`,
    Icon: IconHeart,
  },
  {
    value: 'SMALL_BUSINESS',
    label: msg`Small business`,
    description: msg`CRM pipeline with Bureau docs and Bilan invoicing and bookkeeping`,
    Icon: IconBriefcase,
  },
];
