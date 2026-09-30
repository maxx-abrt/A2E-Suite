import { describe, expect, it } from '@jest/globals';

import { resolveRecordViewEmbedState } from '@/blocknote-editor/utils/resolveRecordViewEmbedState';
import { type ObjectPermissions } from 'twenty-shared/types';

const objectMetadataItems = [{ id: 'task-metadata-id', labelSingular: 'Task' }];

const buildPermissions = (
  canReadObjectRecords: boolean,
): Record<string, ObjectPermissions & { objectMetadataId: string }> => ({
  'task-metadata-id': {
    objectMetadataId: 'task-metadata-id',
    canReadObjectRecords,
    canUpdateObjectRecords: true,
    canSoftDeleteObjectRecords: true,
    canDestroyObjectRecords: true,
    restrictedFields: {},
    rowLevelPermissionPredicates: [],
    rowLevelPermissionPredicateGroups: [],
  },
});

describe('resolveRecordViewEmbedState', () => {
  it('is unconfigured without a view or object', () => {
    expect(
      resolveRecordViewEmbedState({
        viewId: '',
        objectMetadataId: '',
        objectMetadataItems,
        objectPermissionsByObjectMetadataId: {},
      }),
    ).toEqual({ status: 'unconfigured' });
  });

  it('is ready when the view object exists and is readable', () => {
    expect(
      resolveRecordViewEmbedState({
        viewId: 'view-id',
        objectMetadataId: 'task-metadata-id',
        objectMetadataItems,
        objectPermissionsByObjectMetadataId: buildPermissions(true),
      }),
    ).toEqual({ status: 'ready', objectMetadataId: 'task-metadata-id' });
  });

  it('is denied when the object permission forbids reading', () => {
    expect(
      resolveRecordViewEmbedState({
        viewId: 'view-id',
        objectMetadataId: 'task-metadata-id',
        objectMetadataItems,
        objectPermissionsByObjectMetadataId: buildPermissions(false),
      }),
    ).toEqual({ status: 'denied', objectLabel: 'Task' });
  });

  it('is unavailable when the object metadata is not installed', () => {
    expect(
      resolveRecordViewEmbedState({
        viewId: 'view-id',
        objectMetadataId: 'missing-metadata-id',
        objectMetadataItems,
        objectPermissionsByObjectMetadataId: {},
      }),
    ).toEqual({ status: 'unavailable' });
  });
});
