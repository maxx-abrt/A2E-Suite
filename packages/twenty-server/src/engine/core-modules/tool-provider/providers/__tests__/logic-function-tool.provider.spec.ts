import {
  buildToolInputJsonSchema,
  DEFAULT_TOOL_INPUT_SCHEMA,
} from 'twenty-shared/logic-function';

import { LogicFunctionToolProvider } from 'src/engine/core-modules/tool-provider/providers/logic-function-tool.provider';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatLogicFunction } from 'src/engine/metadata-modules/logic-function/types/flat-logic-function.type';

const workspaceId = 'workspace-id';
const roleId = 'role-id';

const buildFlatLogicFunction = (
  overrides: Partial<FlatLogicFunction> &
    Pick<FlatLogicFunction, 'universalIdentifier' | 'id' | 'name'>,
): FlatLogicFunction =>
  ({
    description: null,
    toolTriggerSettings: null,
    deletedAt: null,
    ...overrides,
  }) as FlatLogicFunction;

describe('LogicFunctionToolProvider', () => {
  const generateDescriptors = async (
    logicFunctions: FlatLogicFunction[],
    options?: { includeSchemas?: boolean },
  ) => {
    const flatLogicFunctionMaps =
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatLogicFunction>;

    for (const logicFunction of logicFunctions) {
      flatLogicFunctionMaps.byUniversalIdentifier[
        logicFunction.universalIdentifier
      ] = logicFunction;
      flatLogicFunctionMaps.universalIdentifierById[logicFunction.id] =
        logicFunction.universalIdentifier;
    }

    const flatEntityMapsCacheService = {
      getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
        flatLogicFunctionMaps,
        flatObjectMetadataMaps: createEmptyFlatEntityMaps(),
      }),
    } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

    const provider = new LogicFunctionToolProvider(flatEntityMapsCacheService);

    return (await provider.generateDescriptors(
      {
        workspaceId,
        roleId,
        rolePermissionConfig: { unionOf: [roleId] },
      },
      { includeSchemas: options?.includeSchemas ?? true },
    )) as (ToolIndexEntry | ToolDescriptor)[];
  };

  const context = {
    workspaceId,
    roleId,
    rolePermissionConfig: { unionOf: [roleId] },
  };

  it('exposes logic functions with toolTriggerSettings as app-scoped AI tools', async () => {
    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-1',
        id: 'fn-id-1',
        name: 'Categorize Expense',
        description: 'Categorizes an expense record',
        toolTriggerSettings: {},
      }),
    ]);

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).toMatchObject({
      name: 'app_categorize_expense',
      label: 'Categorize Expense',
      description: 'Categorizes an expense record',
      executionRef: { kind: 'logic_function', logicFunctionId: 'fn-id-1' },
    });
    expect(descriptors[0].category).toBe('LOGIC_FUNCTION');
  });

  it('does not register logic functions without toolTriggerSettings', async () => {
    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-2',
        id: 'fn-id-2',
        name: 'Cron Only Function',
      }),
    ]);

    expect(descriptors).toHaveLength(0);
  });

  it('does not register soft-deleted logic functions', async () => {
    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-3',
        id: 'fn-id-3',
        name: 'Removed Function',
        toolTriggerSettings: {},
        deletedAt: '2026-01-01T00:00:00.000Z',
      }),
    ]);

    expect(descriptors).toHaveLength(0);
  });

  it('falls back to the default input schema when toolTriggerSettings has none', async () => {
    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-4',
        id: 'fn-id-4',
        name: 'No Schema Function',
        toolTriggerSettings: {},
      }),
    ]);

    expect(descriptors).toHaveLength(1);
    expect((descriptors[0] as ToolDescriptor).inputSchema).toEqual(
      DEFAULT_TOOL_INPUT_SCHEMA,
    );
  });

  it('resolves record-typed schema properties to record-id descriptions', async () => {
    const inputSchema = buildToolInputJsonSchema({
      type: 'object',
      properties: {
        expense: { type: 'record', objectUniversalIdentifier: 'expense-uid' },
      },
      required: ['expense'],
    });

    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-5',
        id: 'fn-id-5',
        name: 'Link Expense',
        toolTriggerSettings: { inputSchema },
      }),
    ]);

    expect((descriptors[0] as ToolDescriptor).inputSchema).toEqual({
      type: 'object',
      properties: {
        expense: {
          type: 'string',
          description: 'Id of the linked record',
        },
      },
      required: ['expense'],
    });
  });

  it('omits inputSchema when includeSchemas is false', async () => {
    const descriptors = await generateDescriptors(
      [
        buildFlatLogicFunction({
          universalIdentifier: 'fn-uid-6',
          id: 'fn-id-6',
          name: 'Catalog Only Function',
          toolTriggerSettings: {},
        }),
      ],
      { includeSchemas: false },
    );

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).not.toHaveProperty('inputSchema');
  });

  it('defaults the description when the logic function has none', async () => {
    const descriptors = await generateDescriptors([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-7',
        id: 'fn-id-7',
        name: 'Undescribed Function',
        toolTriggerSettings: {},
      }),
    ]);

    expect(descriptors[0].description).toBe(
      'Execute the Undescribed Function logic function',
    );
  });

  it('reports itself as available', async () => {
    const flatEntityMapsCacheService = {
      getOrRecomputeManyOrAllFlatEntityMaps: jest.fn(),
    } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

    const provider = new LogicFunctionToolProvider(flatEntityMapsCacheService);

    await expect(provider.isAvailable(context)).resolves.toBe(true);
  });
});
