import { type ModulesContainer } from '@nestjs/core';

import { type NestExpressApplication } from '@nestjs/platform-express';

type AppWithContainer = NestExpressApplication & {
  container: ModulesContainer;
};

// The spec's module graph is a distinct copy of the app's, so a class import in
// this file never matches the running container's token. Look the provider up
// from the module container by name instead (getCoreRepository's `strict: false`
// trick only works for repository tokens resolved by the app's own classes).
export const getAppProviderByName = <T>({
  moduleName,
  providerName,
}: {
  moduleName: string;
  providerName: string;
}): T => {
  const modules = [...(global.app as AppWithContainer).container.values()];
  const module = modules.find(
    (candidate) => candidate.metatype?.name === moduleName,
  );

  const wrapper = module
    ? [...module.providers.values()].find(
        ({ name }) => (name as string) === providerName,
      )
    : undefined;

  if (!wrapper?.instance) {
    throw new Error(
      `Could not find ${providerName} in ${moduleName} on the running app`,
    );
  }

  return wrapper.instance as T;
};
