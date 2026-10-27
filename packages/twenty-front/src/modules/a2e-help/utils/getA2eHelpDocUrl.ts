import { type A2eHelpDocPageKey } from '@/a2e-help/constants/A2eHelpDocPages';
import {
  A2E_SUITE_HELP_PAGES,
  A2E_SUITE_IDENTITY,
} from 'twenty-shared/constants';

export const getA2eHelpDocUrl = (key: A2eHelpDocPageKey): string =>
  `${A2E_SUITE_IDENTITY.publicUrl}${A2E_SUITE_HELP_PAGES[key].path}`;
