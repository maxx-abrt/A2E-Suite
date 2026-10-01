import { A2E_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR } from '@/a2e-links/constants/A2eLinkFieldSuffixByObjectNameSingular';
import { A2E_LINK_LINKABLE_OBJECT_NAME_SINGULARS } from '@/a2e-links/constants/A2eLinkLinkableObjectNameSingulars';
import { A2E_LINK_TYPE_USER_LINK } from '@/a2e-links/constants/A2eLinkTypeUserLink';
import {
  type A2eLinkEndpoints,
  buildA2eLinkKey,
} from '@/a2e-links/utils/buildA2eLinkKey';

export const isLinkableObjectNameSingular = (
  objectNameSingular: string,
): boolean =>
  A2E_LINK_LINKABLE_OBJECT_NAME_SINGULARS.includes(objectNameSingular);

// Builds the a2eLink junction row for a source/target pair. Returns null when
// either endpoint has no declared morph leg, because the junction cannot
// persist such a link. The morph legs are one FK per direction group
// (`sourceDocumentId`, `targetTaskId`, ...); the id itself is left to the
// caller so `useCreateOneRecord` mints a fresh v4 (the app's own create path).
export const buildA2eLinkRecordInput = (
  endpoints: A2eLinkEndpoints,
): Record<string, string> | null => {
  const sourceSuffix =
    A2E_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR[
      endpoints.sourceObjectNameSingular
    ];
  const targetSuffix =
    A2E_LINK_FIELD_SUFFIX_BY_OBJECT_NAME_SINGULAR[
      endpoints.targetObjectNameSingular
    ];

  if (sourceSuffix === undefined || targetSuffix === undefined) {
    return null;
  }

  return {
    linkKey: buildA2eLinkKey(endpoints),
    linkType: A2E_LINK_TYPE_USER_LINK,
    [`source${sourceSuffix}Id`]: endpoints.sourceRecordId,
    [`target${targetSuffix}Id`]: endpoints.targetRecordId,
  };
};
