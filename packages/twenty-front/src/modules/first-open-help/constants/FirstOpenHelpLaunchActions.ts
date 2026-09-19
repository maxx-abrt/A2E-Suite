import { type MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';
import { AppPath } from 'twenty-shared/types';
import {
  IconFileText,
  IconPlus,
  IconSparkles,
  type IconComponent,
} from 'twenty-ui/icon';

// The surface a user is currently looking at. Contextual first-open actions
// are chosen from it instead of showing every creation entrypoint at once.
export type FirstOpenHelpContext = 'DOCUMENTS' | 'TASKS' | 'WORKSPACE';

export type FirstOpenHelpLaunchActionKind = 'TEMPLATE' | 'BLANK';

export type FirstOpenHelpLaunchAction = {
  id: string;
  kind: FirstOpenHelpLaunchActionKind;
  label: MessageDescriptor;
  description: MessageDescriptor;
  targetPath: string;
  Icon: IconComponent;
};

export const FIRST_OPEN_HELP_LAUNCH_ACTIONS: Record<
  FirstOpenHelpContext,
  FirstOpenHelpLaunchAction[]
> = {
  DOCUMENTS: [
    {
      id: 'documents-template',
      kind: 'TEMPLATE',
      label: msg`Use a document template`,
      description: msg`Reuse a saved structure and get an independent copy.`,
      targetPath: AppPath.Drive,
      Icon: IconFileText,
    },
    {
      id: 'documents-blank',
      kind: 'BLANK',
      label: msg`Start with a blank document`,
      description: msg`Open an empty document and shape it as you go.`,
      targetPath: AppPath.Drive,
      Icon: IconPlus,
    },
  ],
  TASKS: [
    {
      id: 'tasks-template',
      kind: 'TEMPLATE',
      label: msg`Use a project recipe`,
      description: msg`Reuse a project's standard task list instead of rebuilding it.`,
      targetPath: '/objects/projects',
      Icon: IconSparkles,
    },
    {
      id: 'tasks-blank',
      kind: 'BLANK',
      label: msg`Create a blank task`,
      description: msg`Add a single task and fill in the rest later.`,
      targetPath: AppPath.TasksPage,
      Icon: IconPlus,
    },
  ],
  WORKSPACE: [
    {
      id: 'workspace-template',
      kind: 'TEMPLATE',
      label: msg`Browse document templates`,
      description: msg`Start from a saved structure you can reuse.`,
      targetPath: AppPath.Drive,
      Icon: IconFileText,
    },
    {
      id: 'workspace-blank',
      kind: 'BLANK',
      label: msg`Create your first task`,
      description: msg`Begin with an empty task list and add as you go.`,
      targetPath: AppPath.TasksPage,
      Icon: IconPlus,
    },
  ],
};
