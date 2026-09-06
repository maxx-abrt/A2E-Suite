import {
  WORKSPACE_TEMPLATE_DEFINITIONS,
  type WorkspaceTemplateDefinition,
} from 'src/engine/core-modules/onboarding/constants/workspace-template-definitions.constant';
import { WorkspaceTemplate } from 'src/engine/core-modules/onboarding/enums/workspace-template.enum';

export const getWorkspaceTemplateDefinition = (
  workspaceTemplate: WorkspaceTemplate,
): WorkspaceTemplateDefinition => {
  const definition = WORKSPACE_TEMPLATE_DEFINITIONS[workspaceTemplate];

  if (!definition) {
    throw new Error(
      `No workspace template definition for template ${workspaceTemplate}`,
    );
  }

  return definition;
};
