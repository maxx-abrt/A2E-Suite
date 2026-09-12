import { CoreApiClient } from 'twenty-client-sdk/core';
import { Command } from 'twenty-sdk/front-component';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate } from 'twenty-sdk/front-component';

// GO TO PROJECTS (anatomy rule: every app pins "Go to <app>").
// Navigates to the object index page; a dedicated dashboard page is a
// later P4.2 deliverable (My-tasks / project overview).
export const GO_TO_PROJECTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'c31a0000-0013-4000-8000-000000000005';

const GoToProjectsCommand = () => {
  const execute = async (): Promise<void> => {
    await navigate(AppPath.ObjectIndexPage, {
      objectNamePlural: 'projects',
    });
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier:
    GO_TO_PROJECTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'go-to-projects-command',
  description: 'Ouvre la vue Tous les projets.',
  component: GoToProjectsCommand,
});
