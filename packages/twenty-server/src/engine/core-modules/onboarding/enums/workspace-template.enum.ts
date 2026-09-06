import { registerEnumType } from '@nestjs/graphql';

export enum WorkspaceTemplate {
  CRM = 'CRM',
  INDIVIDUAL = 'INDIVIDUAL',
  STUDENT = 'STUDENT',
  TEAM = 'TEAM',
  NON_PROFIT = 'NON_PROFIT',
  SMALL_BUSINESS = 'SMALL_BUSINESS',
}

registerEnumType(WorkspaceTemplate, {
  name: 'WorkspaceTemplate',
  description:
    'Workspace template preset controlling A2E app installation and CRM navigation visibility',
});
