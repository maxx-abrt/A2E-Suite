import { type SerializedSidePanelNavigationItem } from '@/side-panel/tabs/types/SidePanelTab';
import { parsePath } from 'react-router-dom';
import { SidePanelPages } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

/**
 * Context keys are the deduplication identity of a tab. They are derived from
 * the routed location, so records, and later documents, messages, files and
 * invoices, all dedupe through the same rule without a second implementation.
 *
 * The hash is deliberately excluded: a record opened on its "Notes" tab and the
 * same record opened on "Timeline" is one context, not two.
 */
export type SidePanelTabContextKind =
  | 'record'
  | 'document'
  | 'message'
  | 'channel'
  | 'project'
  | 'invoice'
  | 'file'
  | 'route'
  | 'page';

export const getSidePanelTabContextKey = ({
  kind,
  scope,
  id,
}: {
  kind: SidePanelTabContextKind;
  scope?: string;
  id: string;
}): string =>
  [kind, scope, id].filter((part) => (part?.length ?? 0) > 0).join(':');

export const getSidePanelTabContextKeyFromPath = (path: string): string => {
  const { pathname = '', search = '' } = parsePath(path);

  return getSidePanelTabContextKey({
    kind: 'route',
    id: `${pathname}${search}`,
  });
};

export const getSidePanelTabContextKeyFromSerializedItem = (
  item: SerializedSidePanelNavigationItem,
): string => {
  if (
    item.page === SidePanelPages.RoutedPage &&
    isDefined(item.routedLocation)
  ) {
    return getSidePanelTabContextKey({
      kind: 'route',
      id: `${item.routedLocation.pathname}${item.routedLocation.search}`,
    });
  }

  return getSidePanelTabContextKey({ kind: 'page', id: item.page });
};
