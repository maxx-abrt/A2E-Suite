import { type DefineEntity } from '@/sdk/define/common/types/define-entity.type';
import { createValidationResult } from '@/sdk/define/common/utils/create-validation-result';
import { NavigationMenuItemType } from 'twenty-shared/types';
import {
  isAllowedNavigationMenuItemLink,
  isDefined,
} from 'twenty-shared/utils';

import { type NavigationMenuItemManifest } from 'twenty-shared/application';

export const defineNavigationMenuItem: DefineEntity<
  NavigationMenuItemManifest
> = (config) => {
  const errors: string[] = [];

  if (!config.universalIdentifier) {
    errors.push('NavigationMenuItem must have a universalIdentifier');
  }

  if (typeof config.position !== 'number') {
    errors.push('NavigationMenuItem must have a position');
  }

  // LINK rows may point at an absolute URL or an allow-listed host route
  // (/calendar, /drive, /discussions, /inbox, /chat, /home) so the sidebar can
  // open a native page in-app.
  if (
    config.type === NavigationMenuItemType.LINK &&
    isDefined(config.link) &&
    !isAllowedNavigationMenuItemLink(config.link)
  ) {
    errors.push(
      'NavigationMenuItem LINK must target a valid URL or an allow-listed host route (/calendar, /drive, /discussions, /inbox, /chat, /home)',
    );
  }

  return createValidationResult({ config, errors });
};
