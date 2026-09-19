import { AppPath } from 'twenty-shared/types';

import { type FirstOpenHelpContext } from '~/modules/first-open-help/constants/FirstOpenHelpLaunchActions';

// Ordered most specific first; the first matching route wins.
const FIRST_OPEN_HELP_CONTEXT_ROUTES: {
  prefix: string;
  context: FirstOpenHelpContext;
}[] = [
  { prefix: AppPath.Drive, context: 'DOCUMENTS' },
  { prefix: '/objects/document', context: 'DOCUMENTS' },
  { prefix: '/object/document', context: 'DOCUMENTS' },
  { prefix: AppPath.TasksPage, context: 'TASKS' },
  { prefix: '/objects/task', context: 'TASKS' },
  { prefix: '/objects/projects', context: 'TASKS' },
  { prefix: '/object/task', context: 'TASKS' },
];

const matchesRoute = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const resolveFirstOpenHelpContext = (
  pathname: string,
): FirstOpenHelpContext => {
  const matchingRoute = FIRST_OPEN_HELP_CONTEXT_ROUTES.find(({ prefix }) =>
    matchesRoute(pathname, prefix),
  );

  return matchingRoute?.context ?? 'WORKSPACE';
};
