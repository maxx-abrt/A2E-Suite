import { CoreApiClient } from 'twenty-client-sdk/core';
import {
  type DatabaseEventPayload,
  defineLogicFunction,
} from 'twenty-sdk/define';

import { LOGIC_FUNCTION_IDS } from '../constants/universal-identifiers.ts';
import {
  readFolderParentChange,
  readFolderParentId,
  repairFolderParentCycle,
  type FolderParentEventProperties,
  type FolderParentRecord,
} from '../lib/drive-folder-cycle.ts';

// The server-side cycle guard for the folder tree, mirroring
// guard-document-parent-cycle (P3.3). Any API client can move a folder, so the
// check runs here too. A database event fires after the committed write, so
// the handler cannot reject the row — it restores the previous parent, or
// detaches to the root when there is none.

const handler = async (
  payload: DatabaseEventPayload<{
    recordId: string;
    properties: FolderParentEventProperties;
  }>,
) => {
  const recordId = payload.recordId;

  if (recordId === undefined) {
    return { skipped: 'no-record' };
  }

  const { parentFolderId, previousParentFolderId } = readFolderParentChange(
    payload.properties,
  );

  if (parentFolderId === null) {
    return { skipped: 'root' };
  }

  const client = new CoreApiClient();

  return repairFolderParentCycle({
    folderId: recordId,
    parentFolderId,
    previousParentFolderId,
    loadParentFolderId: async (folderId) => {
      const result = (await client.query({
        driveFolders: {
          __args: { filter: { id: { eq: folderId } }, first: 1 },
          edges: { node: { id: true, parent: { id: true } } },
        },
      } as never)) as {
        driveFolders?: { edges?: { node: FolderParentRecord }[] };
      };

      return readFolderParentId(result?.driveFolders?.edges?.[0]?.node);
    },
    updateParentFolderId: async ({
      folderId,
      parentFolderId: repairedParentFolderId,
    }) => {
      await client.mutation({
        updateDriveFolder: {
          __args: {
            id: folderId,
            data: { parentId: repairedParentFolderId },
          },
          id: true,
        },
      } as never);
    },
  });
};

export default defineLogicFunction({
  universalIdentifier: LOGIC_FUNCTION_IDS.guardDriveFolderParentCycle,
  name: 'guard-drive-folder-parent-cycle',
  description:
    'Restaure le parent précédent (ou la racine) lorsqu’un déplacement placerait un dossier sous l’un de ses descendants.',
  timeoutSeconds: 60,
  databaseEventTriggerSettings: {
    eventName: 'driveFolder.updated',
    updatedFields: ['parent', 'parentId', 'parentFolderId'],
  },
  handler,
});
