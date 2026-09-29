import { z } from 'zod';

import { isAllowedNavigationMenuItemLink } from 'twenty-shared/utils';

export const navigationMenuItemLinkSchema = z
  .string()
  .describe(
    'External URL, or an allow-listed internal host route opened in-app (e.g. "/calendar", "/drive", "/discussions", "/inbox", "/chat", "/home").',
  )
  .refine(isAllowedNavigationMenuItemLink, {
    message:
      'Must be a valid URL or an allow-listed internal host route (/calendar, /drive, /discussions, /inbox, /chat, /home).',
  });
