import { type A2eLinkEndpoints } from '@/a2e-links/utils/buildA2eLinkKey';
import { isLinkableObjectNameSingular } from '@/a2e-links/utils/buildA2eLinkRecordInput';
import { isDefined } from 'twenty-shared/utils';

// A created item can only be pre-linked when a2e-links is installed AND both
// endpoints have a declared morph leg. The declared set is {document, task}, so
// project/event/invoice/expense/file creations degrade to unlinked creation —
// they must never attempt a junction write that has no leg.
export const shouldPreLinkQuickCreate = ({
  isA2eLinksApplicationInstalled,
  sourceObjectNameSingular,
  createdObjectNameSingular,
}: {
  isA2eLinksApplicationInstalled: boolean;
  sourceObjectNameSingular: string | undefined;
  createdObjectNameSingular: string;
}): boolean =>
  isA2eLinksApplicationInstalled &&
  isDefined(sourceObjectNameSingular) &&
  isLinkableObjectNameSingular(sourceObjectNameSingular) &&
  isLinkableObjectNameSingular(createdObjectNameSingular);

// The junction endpoints for the US-147/148 path: source = current record,
// target = the item just created.
export const buildQuickCreatePreLinkEndpoints = ({
  sourceObjectNameSingular,
  sourceRecordId,
  createdObjectNameSingular,
  createdRecordId,
}: {
  sourceObjectNameSingular: string;
  sourceRecordId: string;
  createdObjectNameSingular: string;
  createdRecordId: string;
}): A2eLinkEndpoints => ({
  sourceObjectNameSingular,
  sourceRecordId,
  targetObjectNameSingular: createdObjectNameSingular,
  targetRecordId: createdRecordId,
});
