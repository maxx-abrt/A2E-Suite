import 'reflect-metadata';

import { Injectable } from '@nestjs/common';

const REGISTERED_SEARCH_PROVIDER_KEY = 'REGISTERED_SEARCH_PROVIDER';

export type RegisteredSearchProviderMetadata = {
  // Application universal identifier owning the provider; the registry keys
  // by app id so results group per app and per-app gating stays possible.
  appUniversalIdentifier: string;
};

// Search app providers self-register via class decorator and are discovered
// by SearchProviderRegistryService (same pattern as RegisteredInstanceCommand).
export const RegisteredSearchProvider =
  (metadata: RegisteredSearchProviderMetadata): ClassDecorator =>
  (target) => {
    Injectable()(target);
    Reflect.defineMetadata(REGISTERED_SEARCH_PROVIDER_KEY, metadata, target);
  };

export const getRegisteredSearchProviderMetadata = (
  target: Function,
): RegisteredSearchProviderMetadata | undefined =>
  Reflect.getMetadata(REGISTERED_SEARCH_PROVIDER_KEY, target);
