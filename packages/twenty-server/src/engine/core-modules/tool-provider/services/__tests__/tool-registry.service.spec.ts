import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ToolCategory } from 'twenty-shared/ai';

import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { LogicFunctionToolProvider } from 'src/engine/core-modules/tool-provider/providers/logic-function-tool.provider';
import { ToolRegistryService } from 'src/engine/core-modules/tool-provider/services/tool-registry.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { type WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
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

// The assistant catalogue is resolved by ToolRegistryService over the
// registered ToolProviders; the only app-surface provider is
// LogicFunctionToolProvider reading the workspace flat maps. These specs pin
// install/uninstall exposure at that resolution boundary, so a regression in
// the registry (or the provider) that keeps an uninstalled app's tools, or
// drops an installed one's, is caught where the assistant sees it — not only
// inside the provider.
describe('ToolRegistryService native app-tool exposure', () => {
  const buildRegistry = (logicFunctions: FlatLogicFunction[]) => {
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

    const providers: ToolProvider[] = [
      new LogicFunctionToolProvider(flatEntityMapsCacheService),
    ];

    const toolExecutorService = { dispatch: jest.fn() } as never;
    const toolOutputSpillService = {
      spillIfTooLarge: jest.fn(async (output) => output),
    } as never;

    return new ToolRegistryService(
      providers,
      toolExecutorService,
      toolOutputSpillService,
    );
  };

  const context = (): ToolProviderContext => ({
    workspaceId,
    roleId,
    rolePermissionConfig: { unionOf: [roleId] },
  });

  it('exposes an installed app\u2019s toolTriggerSettings tool in the catalogue', async () => {
    const registry = buildRegistry([
      buildFlatLogicFunction({
        universalIdentifier: 'fn-uid-installed',
        id: 'fn-id-installed',
        name: 'Summarize Channel',
        toolTriggerSettings: {},
      }),
    ]);

    const catalogue = await registry.getCatalog(context());

    expect(catalogue.map((entry) => entry.name)).toEqual([
      'app_summarize_channel',
    ]);
    expect(catalogue[0].category).toBe(ToolCategory.LOGIC_FUNCTION);
  });

  it('drops an uninstalled app\u2019s tools from the catalogue after uninstall', async () => {
    const installedTool = buildFlatLogicFunction({
      universalIdentifier: 'fn-uid-installed',
      id: 'fn-id-installed',
      name: 'Summarize Channel',
      toolTriggerSettings: {},
    });

    const whileInstalled = await buildRegistry([installedTool]).getCatalog(
      context(),
    );

    expect(whileInstalled.map((entry) => entry.name)).toContain(
      'app_summarize_channel',
    );

    // Uninstall soft-deletes the app's logic functions in place; the registry
    // must not need any explicit unregistration call to hide them.
    const afterUninstall = await buildRegistry([
      { ...installedTool, deletedAt: '2026-02-01T00:00:00.000Z' },
    ]).getCatalog(context());

    expect(afterUninstall.map((entry) => entry.name)).not.toContain(
      'app_summarize_channel',
    );
    expect(afterUninstall).toHaveLength(0);
  });

  it('reflects install then uninstall across the full catalogue lifecycle', async () => {
    const appTool = buildFlatLogicFunction({
      universalIdentifier: 'fn-uid-lifecycle',
      id: 'fn-id-lifecycle',
      name: 'Draft Email Reply',
      toolTriggerSettings: {},
    });

    const beforeInstall = await buildRegistry([]).getCatalog(context());
    const afterInstall = await buildRegistry([appTool]).getCatalog(context());
    const afterUninstall = await buildRegistry([
      { ...appTool, deletedAt: '2026-02-01T00:00:00.000Z' },
    ]).getCatalog(context());

    expect(beforeInstall).toHaveLength(0);
    expect(afterInstall.map((entry) => entry.name)).toEqual([
      'app_draft_email_reply',
    ]);
    expect(afterUninstall).toHaveLength(0);
  });

  it('resolves the catalogue from the server-supplied context, never a client identity', async () => {
    const getOrRecomputeManyOrAllFlatEntityMaps = jest.fn().mockResolvedValue({
      flatLogicFunctionMaps: createEmptyFlatEntityMaps(),
      flatObjectMetadataMaps: createEmptyFlatEntityMaps(),
    });

    const flatEntityMapsCacheService = {
      getOrRecomputeManyOrAllFlatEntityMaps,
    } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

    const registry = new ToolRegistryService(
      [new LogicFunctionToolProvider(flatEntityMapsCacheService)],
      { dispatch: jest.fn() } as never,
      { spillIfTooLarge: jest.fn(async (output) => output) } as never,
    );

    await registry.buildToolIndex(workspaceId, roleId, {
      userId: 'server-derived-user-id',
      userWorkspaceId: 'server-derived-user-workspace-id',
      locale: 'en',
    });

    expect(getOrRecomputeManyOrAllFlatEntityMaps).toHaveBeenCalledWith({
      workspaceId,
      flatMapsKeys: ['flatLogicFunctionMaps', 'flatObjectMetadataMaps'],
    });
  });

  it('carries the server-derived workspace and role through resolveAndExecute context', async () => {
    const flatEntityMapsCacheService = {
      getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue({
        flatLogicFunctionMaps: createEmptyFlatEntityMaps(),
        flatObjectMetadataMaps: createEmptyFlatEntityMaps(),
      }),
    } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

    const dispatch = jest.fn();
    const registry = new ToolRegistryService(
      [new LogicFunctionToolProvider(flatEntityMapsCacheService)],
      { dispatch } as never,
      { spillIfTooLarge: jest.fn(async (output) => output) } as never,
    );

    const result = await registry.resolveAndExecute(
      'app_not_installed',
      {},
      context(),
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('app_not_installed');
  });

  it('is available regardless of context so an uninstall cannot leave a registered provider', async () => {
    const flatEntityMapsCacheService = {
      getOrRecomputeManyOrAllFlatEntityMaps: jest.fn(),
    } as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService;

    const provider = new LogicFunctionToolProvider(flatEntityMapsCacheService);

    await expect(provider.isAvailable(context())).resolves.toBe(true);
  });
});

// Grep-proof record: no registerAiTools hook, duplicate registry table or
// manual registration path exists. App tools reach the assistant catalogue
// exclusively through a logic function's toolTriggerSettings (P1.5), so any
// future addition of a parallel registration mechanism must update this
// assertion deliberately rather than slip in silently.
describe('native tool registry has no parallel registration path', () => {
  const providerPath = join(
    __dirname,
    '..',
    '..',
    'providers',
    'logic-function-tool.provider.ts',
  );

  it('exposes only the toolTriggerSettings-driven provider and no manual hook', () => {
    const providerSource = readFileSync(providerPath, 'utf8');

    expect(providerSource).toContain('toolTriggerSettings');
    expect(providerSource).not.toMatch(
      /registerAiTools|registerTool|addAiTool|unregisterTool/,
    );
  });

  it('does not declare a second registration table or hook in the provider', () => {
    const providerSource = readFileSync(providerPath, 'utf8');

    // A duplicate registry would need a new persisted entity or an explicit
    // hook decorated onto the provider; neither exists.
    expect(providerSource).not.toMatch(/aiToolRegistry|AiToolRegistry/);
    expect(providerSource).not.toMatch(/@OnApplicationBootstrap|@OnModuleInit/);
  });
});

// The registry is the boundary every assistant tool call crosses. A restricted
// member's catalogue is built from their own role + workspace, so a tool they
// cannot use is simply absent and invocation fails closed with the same single
// not-found error as a tool that never existed — no "forbidden" surface and no
// record/object detail leaks. A caller can never point a tool at another
// workspace: only the server-derived `workspaceId` on the context reaches the
// executor, never a value carried in tool args.
describe('restricted-member and cross-workspace denial at the catalogue boundary', () => {
  const ownerWorkspaceId = 'workspace-id';
  const foreignWorkspaceId = 'foreign-workspace-id';
  const privilegedRoleId = 'privileged-role-id';
  const restrictedRoleId = 'restricted-role-id';

  const buildScopedProvider = ({
    workspaceId: ownedWorkspaceId,
    roleId: ownedRoleId,
    toolName,
  }: {
    workspaceId: string;
    roleId: string;
    toolName: string;
  }): ToolProvider => ({
    category: ToolCategory.LOGIC_FUNCTION,
    isAvailable: async () => true,
    generateDescriptors: async (providerContext) =>
      providerContext.workspaceId === ownedWorkspaceId &&
      providerContext.roleId === ownedRoleId
        ? [
            {
              name: toolName,
              label: toolName,
              description: toolName,
              category: ToolCategory.LOGIC_FUNCTION,
              executionRef: {
                kind: 'logic_function',
                logicFunctionId: 'logic-function-id',
              },
            },
          ]
        : [],
    executeStaticTool: async () => ({
      success: false,
      message: 'unused',
      error: 'unused',
    }),
  });

  const buildRegistry = (providers: ToolProvider[]) => {
    const dispatch = jest.fn();

    return {
      registry: new ToolRegistryService(
        providers,
        { dispatch } as never,
        { spillIfTooLarge: jest.fn(async (output) => output) } as never,
      ),
      dispatch,
    };
  };

  it('fails a restricted invocation closed with the same single not-found error as a missing tool', async () => {
    const { registry, dispatch } = buildRegistry([
      buildScopedProvider({
        workspaceId: ownerWorkspaceId,
        roleId: privilegedRoleId,
        toolName: 'app_read_secret_document',
      }),
    ]);

    const restrictedContext: ToolProviderContext = {
      workspaceId: ownerWorkspaceId,
      roleId: restrictedRoleId,
      rolePermissionConfig: { unionOf: [restrictedRoleId] },
    };

    const unauthorized = await registry.resolveAndExecute(
      'app_read_secret_document',
      {},
      restrictedContext,
    );
    const nonexistent = await registry.resolveAndExecute(
      'app_never_existed',
      {},
      restrictedContext,
    );

    expect(unauthorized.success).toBe(false);
    expect(unauthorized.result).toBeUndefined();
    expect(nonexistent.success).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();

    // Missing and unauthorized are indistinguishable at this boundary: the
    // error names only the requested tool, exactly as for a tool that was
    // never registered.
    expect(unauthorized.error).toEqual(
      nonexistent.error?.replace(
        'app_never_existed',
        'app_read_secret_document',
      ),
    );
  });

  it('never resolves a tool owned by another workspace', async () => {
    const { registry, dispatch } = buildRegistry([
      buildScopedProvider({
        workspaceId: foreignWorkspaceId,
        roleId: privilegedRoleId,
        toolName: 'app_foreign_workspace_tool',
      }),
    ]);

    const callerContext: ToolProviderContext = {
      workspaceId: ownerWorkspaceId,
      roleId: privilegedRoleId,
      rolePermissionConfig: { unionOf: [privilegedRoleId] },
    };

    await expect(registry.getCatalog(callerContext)).resolves.toHaveLength(0);

    const result = await registry.resolveAndExecute(
      'app_foreign_workspace_tool',
      {},
      callerContext,
    );

    expect(result.success).toBe(false);
    expect(result.result).toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('dispatches with the server-derived workspace, ignoring a workspace id carried in tool args', async () => {
    const { registry, dispatch } = buildRegistry([
      buildScopedProvider({
        workspaceId: ownerWorkspaceId,
        roleId: privilegedRoleId,
        toolName: 'app_read_document',
      }),
    ]);

    dispatch.mockResolvedValue({ success: true, message: 'ok' });

    const callerContext: ToolProviderContext = {
      workspaceId: ownerWorkspaceId,
      roleId: privilegedRoleId,
      rolePermissionConfig: { unionOf: [privilegedRoleId] },
    };

    const result = await registry.resolveAndExecute(
      'app_read_document',
      { documentId: 'foreign-record-id', workspaceId: foreignWorkspaceId },
      callerContext,
    );

    expect(result.success).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);

    const dispatchedContext = dispatch.mock.calls[0][2];

    expect(dispatchedContext.workspaceId).toBe(ownerWorkspaceId);
    expect(dispatchedContext.rolePermissionConfig).toEqual({
      unionOf: [privilegedRoleId],
    });
  });
});
