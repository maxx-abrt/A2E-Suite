import gql from 'graphql-tag';
import { useCallback } from 'react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';
import { useObjectMetadataItems } from '@/object-metadata/hooks/useObjectMetadataItems';
import { getDeleteManyRecordsMutationResponseField } from '@/object-record/utils/getDeleteManyRecordsMutationResponseField';
import {
  undoTemplateApply,
  type TemplateApplyUndoGroup,
  type TemplateApplyUndoReport,
} from '@/template-gallery/utils/undoTemplateApply';
import { capitalize, isDefined } from 'twenty-shared/utils';
import { type TemplateApplyCreatedRecord } from 'twenty-shared/application';

// M13f — the host-side undo for a template apply. It removes exactly the ids the
// apply operation reported, through the same soft-delete mutation the native
// record index uses (no hard delete, no new write path). The owning app stays
// the only writer; this only reverses the operation it already performed.
export const useUndoTemplateApply = () => {
  const apolloCoreClient = useApolloCoreClient();
  const { objectMetadataItems } = useObjectMetadataItems();

  const deleteGroup = useCallback(
    async (group: TemplateApplyUndoGroup): Promise<string[]> => {
      const objectMetadataItem = objectMetadataItems.find(
        (candidate) => candidate.nameSingular === group.object,
      );

      if (!isDefined(objectMetadataItem)) {
        throw new Error(`Unknown object "${group.object}"`);
      }

      const mutationResponseField = getDeleteManyRecordsMutationResponseField(
        objectMetadataItem.namePlural,
      );

      const deleteManyRecordsMutation = gql`
        mutation DeleteManyRecordsForTemplateApplyUndo($filter: ${capitalize(
          objectMetadataItem.nameSingular,
        )}FilterInput!) {
          ${mutationResponseField}(filter: $filter) {
            id
          }
        }
      `;

      const response = await apolloCoreClient.mutate<
        Record<string, { id: string }[]>
      >({
        mutation: deleteManyRecordsMutation,
        variables: { filter: { id: { in: group.ids } } },
      });

      return (response.data?.[mutationResponseField] ?? []).map(
        (record) => record.id,
      );
    },
    [apolloCoreClient, objectMetadataItems],
  );

  const undoTemplateApplyResult = useCallback(
    async (
      created: TemplateApplyCreatedRecord[],
    ): Promise<TemplateApplyUndoReport> =>
      undoTemplateApply(created, deleteGroup),
    [deleteGroup],
  );

  return { undoTemplateApplyResult };
};
