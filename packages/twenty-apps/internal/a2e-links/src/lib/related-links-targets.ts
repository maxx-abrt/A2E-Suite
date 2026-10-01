import type { CoreApiClient } from 'twenty-client-sdk/core';

import {
  RELATED_LINKED_OBJECT_NAME_SINGULARS,
  RELATED_LINKS_TYPE_USER_LINK,
  type RelatedLinkedObjectNameSingular,
} from './related-links.ts';

// Link creation for the Related panel's empty state (M11a-i3).
//
// A front component runs sandboxed and cannot reach the host
// `SingleRecordPicker` used by the header "Link…" action (US-148), so the
// empty state offers an equivalent inline action: search the declared
// linkable set and write the same `a2eLink` junction row. The `linkKey` and
// the morph FK names are identical to the host path, so a link created here
// and one created from the header dedupe against each other and share the one
// related store.

// List queries address the plural root field (documents, tasks); a findOne by
// id uses the singular root. Kept next to the suffix map so both stay in sync.
export const RELATED_LINKED_OBJECT_NAME_PLURALS: Record<
  RelatedLinkedObjectNameSingular,
  string
> = {
  document: 'documents',
  task: 'tasks',
};

// Morph FK field suffix per linkable object: the join column is
// `${direction}${suffix}Id` (sourceDocumentId, targetTaskId, ...), read from
// the joinColumnName in src/fields/*.field.ts. Kept in sync with the host
// twenty-front copy.
export const RELATED_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR: Record<
  string,
  string
> = {
  document: 'Document',
  task: 'Task',
};

export type RelatedLinkEndpoints = {
  sourceObjectNameSingular: string;
  sourceRecordId: string;
  targetObjectNameSingular: string;
  targetRecordId: string;
};

export const buildRelatedLinkKey = ({
  sourceObjectNameSingular,
  sourceRecordId,
  targetObjectNameSingular,
  targetRecordId,
}: RelatedLinkEndpoints): string =>
  `${sourceObjectNameSingular}:${sourceRecordId}:${targetObjectNameSingular}:${targetRecordId}`;

// Returns null when either endpoint has no declared morph leg (the junction
// cannot persist it) or the pair is the record linking to itself.
export const buildRelatedLinkRecordInput = (
  endpoints: RelatedLinkEndpoints,
): Record<string, string> | null => {
  const sourceSuffix =
    RELATED_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR[
      endpoints.sourceObjectNameSingular
    ];
  const targetSuffix =
    RELATED_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR[
      endpoints.targetObjectNameSingular
    ];

  if (sourceSuffix === undefined || targetSuffix === undefined) {
    return null;
  }

  if (
    endpoints.sourceObjectNameSingular === endpoints.targetObjectNameSingular &&
    endpoints.sourceRecordId === endpoints.targetRecordId
  ) {
    return null;
  }

  return {
    linkKey: buildRelatedLinkKey(endpoints),
    linkType: RELATED_LINKS_TYPE_USER_LINK,
    [`source${sourceSuffix}Id`]: endpoints.sourceRecordId,
    [`target${targetSuffix}Id`]: endpoints.targetRecordId,
  };
};

export type RelatedLinkTarget = {
  objectNameSingular: string;
  recordId: string;
  title: string;
};

// Title search over one linkable object. `ilike` is the core contains filter;
// the server still enforces read permission, so only readable rows return.
export const buildRelatedTargetSearchQuery = (
  objectNameSingular: RelatedLinkedObjectNameSingular,
  searchText: string,
): Record<string, unknown> => ({
  [RELATED_LINKED_OBJECT_NAME_PLURALS[objectNameSingular]]: {
    __args: {
      filter: { title: { ilike: `%${searchText}%` } },
      first: 10,
    },
    edges: { node: { id: true, title: true } },
  },
});

type RelatedTargetSearchResult = {
  edges?: { node: { id?: string | null; title?: string | null } }[];
};

export const mapRelatedTargetSearchResults = (
  objectNameSingular: string,
  result: RelatedTargetSearchResult | undefined,
): RelatedLinkTarget[] => {
  const targets: RelatedLinkTarget[] = [];

  for (const edge of result?.edges ?? []) {
    const id = edge.node.id;

    if (typeof id !== 'string' || id.trim() === '') {
      continue;
    }

    targets.push({
      objectNameSingular,
      recordId: id,
      title:
        typeof edge.node.title === 'string' && edge.node.title.trim() !== ''
          ? edge.node.title
          : '',
    });
  }

  return targets;
};

export const mergeRelatedTargetResults = (
  lists: RelatedLinkTarget[][],
  exclude: { objectNameSingular: string; recordId: string },
): RelatedLinkTarget[] => {
  const seen = new Set<string>();
  const merged: RelatedLinkTarget[] = [];

  for (const target of lists.flat()) {
    if (
      target.objectNameSingular === exclude.objectNameSingular &&
      target.recordId === exclude.recordId
    ) {
      continue;
    }

    const key = `${target.objectNameSingular}:${target.recordId}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(target);
  }

  return merged;
};

export type RelatedTargetSearchClient = Pick<CoreApiClient, 'query'>;

// Searches every declared linkable object in parallel and returns the merged,
// deduped, self-excluded result set. A failing object is skipped rather than
// failing the whole search.
export const searchRelatedLinkTargets = async (
  client: RelatedTargetSearchClient,
  {
    searchText,
    exclude,
  }: {
    searchText: string;
    exclude: { objectNameSingular: string; recordId: string };
  },
): Promise<RelatedLinkTarget[]> => {
  const trimmed = searchText.trim();

  if (trimmed === '') {
    return [];
  }

  const lists = await Promise.all(
    RELATED_LINKED_OBJECT_NAME_SINGULARS.map(async (objectNameSingular) => {
      try {
        const result = (await client.query(
          buildRelatedTargetSearchQuery(objectNameSingular, trimmed) as never,
        )) as Record<string, RelatedTargetSearchResult | undefined>;

        return mapRelatedTargetSearchResults(
          objectNameSingular,
          result[RELATED_LINKED_OBJECT_NAME_PLURALS[objectNameSingular]],
        );
      } catch {
        return [];
      }
    }),
  );

  return mergeRelatedTargetResults(lists, exclude);
};
