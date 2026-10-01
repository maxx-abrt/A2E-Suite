import type { CoreApiClient } from 'twenty-client-sdk/core';

// M11a-i3 "Related" read model (US-149).
//
// A record page lists everything linked to or from the current record. Both
// directions are read from the persisted inverse relation the app already
// owns (document/task `outgoingLinks` and `incomingLinks`): the outbound rows
// are the current record's outgoing junction rows, the inbound rows are its
// incoming (backlink) rows. Nothing is scanned at read time and no body is
// ever selected — the relation IS the index.
//
// The reader is client-injected so the node unit runner can exercise the
// mapping, the permission drop and the uninstall-degrade path without a live
// workspace.

// The two consumer targets that declare the inverse O2M fields (US-147). A
// record of any other object has no Related surface, so the reader refuses it
// instead of emitting a query the junction cannot serve.
export const RELATED_LINKED_OBJECT_NAME_SINGULARS = ['document', 'task'] as const;

export type RelatedLinkedObjectNameSingular =
  (typeof RELATED_LINKED_OBJECT_NAME_SINGULARS)[number];

export const RELATED_LINKS_TYPE_USER_LINK = 'USER_LINK';

// The index is one row per source document or link, so a single bounded page
// is enough to render the panel.
export const RELATED_LINKS_PAGE_SIZE = 200;

export type RelatedLinkDirection = 'outbound' | 'inbound';

export type RelatedLink = {
  linkId: string;
  direction: RelatedLinkDirection;
  linkType: string | null;
  label: string | null;
  objectNameSingular: string;
  recordId: string;
  title: string;
};

export type RelatedLinks = {
  outbound: RelatedLink[];
  inbound: RelatedLink[];
};

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '';

export const isRelatedLinkedObjectNameSingular = (
  objectNameSingular: string,
): objectNameSingular is RelatedLinkedObjectNameSingular =>
  RELATED_LINKED_OBJECT_NAME_SINGULARS.includes(
    objectNameSingular as RelatedLinkedObjectNameSingular,
  );

export const createEmptyRelatedLinks = (): RelatedLinks => ({
  outbound: [],
  inbound: [],
});

type RelatedEndpointRecord = {
  id?: string | null;
  title?: string | null;
} | null;

type RelatedA2eLinkNode = {
  id?: string | null;
  label?: string | null;
  linkType?: string | null;
  sourceDocument?: RelatedEndpointRecord;
  sourceTask?: RelatedEndpointRecord;
  targetDocument?: RelatedEndpointRecord;
  targetTask?: RelatedEndpointRecord;
};

type RelatedLinksRootRecord = {
  outgoingLinks?: { edges?: { node: RelatedA2eLinkNode }[] } | null;
  incomingLinks?: { edges?: { node: RelatedA2eLinkNode }[] } | null;
} | null;

// The "other side" morph leg per direction: an outgoing row points at its
// target, an incoming (backlink) row points back at its source. Both groups
// carry one leg per declared linkable object, so the object is decided by
// which leg resolved.
const OTHER_SIDE_LEGS: Record<
  RelatedLinkDirection,
  { field: 'sourceDocument' | 'sourceTask' | 'targetDocument' | 'targetTask'; objectNameSingular: RelatedLinkedObjectNameSingular }[]
> = {
  outbound: [
    { field: 'targetDocument', objectNameSingular: 'document' },
    { field: 'targetTask', objectNameSingular: 'task' },
  ],
  inbound: [
    { field: 'sourceDocument', objectNameSingular: 'document' },
    { field: 'sourceTask', objectNameSingular: 'task' },
  ],
};

export const mapRelatedLinkNode = (
  node: RelatedA2eLinkNode,
  direction: RelatedLinkDirection,
): RelatedLink | null => {
  if (!hasText(node.id)) {
    return null;
  }

  for (const leg of OTHER_SIDE_LEGS[direction]) {
    const endpoint = node[leg.field];

    // A null endpoint means the viewer cannot read the linked record (the
    // server resolves an unauthorized relation to null) or the leg is empty.
    // Dropping it here keeps a private record from leaking its title.
    if (endpoint === null || endpoint === undefined || !hasText(endpoint.id)) {
      continue;
    }

    return {
      linkId: node.id,
      direction,
      linkType: hasText(node.linkType) ? node.linkType : null,
      label: hasText(node.label) ? node.label : null,
      objectNameSingular: leg.objectNameSingular,
      recordId: endpoint.id,
      title: hasText(endpoint.title) ? endpoint.title : '',
    };
  }

  return null;
};

export const mapRelatedLinksRootRecord = (
  rootRecord: RelatedLinksRootRecord,
): RelatedLinks => {
  const outbound = (rootRecord?.outgoingLinks?.edges ?? [])
    .map((edge) => mapRelatedLinkNode(edge.node, 'outbound'))
    .filter((link): link is RelatedLink => link !== null);
  const inbound = (rootRecord?.incomingLinks?.edges ?? [])
    .map((edge) => mapRelatedLinkNode(edge.node, 'inbound'))
    .filter((link): link is RelatedLink => link !== null);

  return { outbound, inbound };
};

export const countRelatedLinks = (links: RelatedLinks): number =>
  links.outbound.length + links.inbound.length;

// The junction rows are selected with their two morph legs per direction; the
// inverse O2M fields are named identically on both consumer targets, so only
// the root field changes between document and task.
export const buildRelatedLinksGraphqlQuery = (
  objectNameSingular: RelatedLinkedObjectNameSingular,
  recordId: string,
): Record<string, unknown> => ({
  [objectNameSingular]: {
    __args: { filter: { id: { eq: recordId } } },
    outgoingLinks: {
      __args: { first: RELATED_LINKS_PAGE_SIZE },
      edges: {
        node: {
          id: true,
          label: true,
          linkType: true,
          targetDocument: { id: true, title: true },
          targetTask: { id: true, title: true },
        },
      },
    },
    incomingLinks: {
      __args: { first: RELATED_LINKS_PAGE_SIZE },
      edges: {
        node: {
          id: true,
          label: true,
          linkType: true,
          sourceDocument: { id: true, title: true },
          sourceTask: { id: true, title: true },
        },
      },
    },
  },
});

export type RelatedLinksClient = Pick<CoreApiClient, 'query'>;

// The reader. It never throws: a failed query (a2e-links gone, object absent,
// read denied) degrades to an empty Related panel rather than a broken
// surface, which is what an uninstall must leave behind.
export const readRelatedLinks = async (
  client: RelatedLinksClient,
  target: { objectNameSingular: string; recordId: string },
): Promise<RelatedLinks> => {
  if (
    !isRelatedLinkedObjectNameSingular(target.objectNameSingular) ||
    !hasText(target.recordId)
  ) {
    return createEmptyRelatedLinks();
  }

  try {
    const result = (await client.query(
      buildRelatedLinksGraphqlQuery(
        target.objectNameSingular,
        target.recordId,
      ) as never,
    )) as Record<string, RelatedLinksRootRecord | undefined>;

    return mapRelatedLinksRootRecord(
      result[target.objectNameSingular] ?? null,
    );
  } catch {
    return createEmptyRelatedLinks();
  }
};
