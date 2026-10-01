import { filterLinkableObjectMetadataItems } from '@/a2e-links/utils/filterLinkableObjectMetadataItems';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type ObjectPermissions } from 'twenty-shared/types';

const buildObjectMetadataItem = (
  overrides: Partial<EnrichedObjectMetadataItem>,
): EnrichedObjectMetadataItem =>
  ({
    id: 'object-id',
    nameSingular: 'object',
    isActive: true,
    isSystem: false,
    isSearchable: true,
    ...overrides,
  }) as EnrichedObjectMetadataItem;

const buildPermissions = (
  objectMetadataId: string,
  canReadObjectRecords: boolean,
): ObjectPermissions & { objectMetadataId: string } =>
  ({ objectMetadataId, canReadObjectRecords }) as ObjectPermissions & {
    objectMetadataId: string;
  };

describe('filterLinkableObjectMetadataItems', () => {
  it('keeps only readable, active, searchable objects that have a morph leg', () => {
    const document = buildObjectMetadataItem({
      id: 'document-id',
      nameSingular: 'document',
    });
    const task = buildObjectMetadataItem({
      id: 'task-id',
      nameSingular: 'task',
    });
    const company = buildObjectMetadataItem({
      id: 'company-id',
      nameSingular: 'company',
    });

    const result = filterLinkableObjectMetadataItems(
      [document, task, company],
      {
        'document-id': buildPermissions('document-id', true),
        'task-id': buildPermissions('task-id', true),
        'company-id': buildPermissions('company-id', true),
      },
    );

    expect(result.map((item) => item.nameSingular)).toEqual([
      'document',
      'task',
    ]);
  });

  it('drops an object the viewer cannot read', () => {
    const task = buildObjectMetadataItem({
      id: 'task-id',
      nameSingular: 'task',
    });

    const result = filterLinkableObjectMetadataItems([task], {
      'task-id': buildPermissions('task-id', false),
    });

    expect(result).toEqual([]);
  });

  it('drops inactive, system, and non-searchable objects', () => {
    const inactiveDocument = buildObjectMetadataItem({
      id: 'inactive-document-id',
      nameSingular: 'document',
      isActive: false,
    });
    const systemTask = buildObjectMetadataItem({
      id: 'system-task-id',
      nameSingular: 'task',
      isSystem: true,
    });
    const hiddenDocument = buildObjectMetadataItem({
      id: 'hidden-document-id',
      nameSingular: 'document',
      isSearchable: false,
    });

    const result = filterLinkableObjectMetadataItems(
      [inactiveDocument, systemTask, hiddenDocument],
      {},
    );

    expect(result).toEqual([]);
  });
});
