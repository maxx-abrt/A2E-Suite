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
    description: msg`Personal workspace with Documents; CRM navigation hidden`,
    Icon: IconUser,
  },
  {
    value: 'STUDENT',
    label: msg`Student`,
    description: msg`Notes-first workspace for courses and projects`,
    Icon: IconBook,
  },
  {
    value: 'TEAM',
    label: msg`Team`,
    description: msg`Collaborative workspace with Documents alongside the CRM`,
    Icon: IconUsers,
  },
  {
    value: 'NON_PROFIT',
    label: msg`Non-profit`,
    description: msg`Members, volunteers and grants with Documents`,
    Icon: IconHeart,
  },
  {
    value: 'SMALL_BUSINESS',
    label: msg`Small business`,
    description: msg`Clients, pipeline and Documents for small companies`,
    Icon: IconBriefcase,
  },
];
