import { isDiscussionsPath } from '~/utils/isDiscussionsPath';

export const isCurrentPathDiscussionsPage = () =>
  isDiscussionsPath(window.location.pathname);
