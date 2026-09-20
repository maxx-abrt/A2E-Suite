import { AppPath } from 'twenty-shared/types';

import { isMatchingPathname } from '~/utils/isMatchingPathname';

export const isDiscussionsPath = (pathname: string) =>
  isMatchingPathname(pathname, AppPath.Discussions);
