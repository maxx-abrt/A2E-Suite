import { ToolCategory } from 'twenty-shared/ai';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { ToolExecutorService } from 'src/engine/core-modules/tool-provider/services/tool-executor.service';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';

const workspaceId = 'caller-workspace-id';
const restrictedRoleId = 'restricted-role-id';

// The executor is where a tool's caller context becomes the actual read/write.
// These specs pin the two boundaries the assistant must never cross: the
// workspace pointed at is the one on the server-derived context (never a value
// carried in tool args), and the role permission config that scopes a read is
// the caller's own (never a widened one). The record-level result is then
// decided downstream by the scoped query runner, so a missing and an
// unauthorized record return the same empty result.
const buildExecutor = (
  overrides: {
    findRecordsService?: { execute: jest.Mock };
    logicFunctionExecutorService?: { execute: jest.Mock };
  } = {},
) => {
  const findRecordsService = overrides.findRecordsService ?? {
    execute: jest.fn(),
  };
  const logicFunctionExecutorService =
    overrides.logicFunctionExecutorService ?? { execute: jest.fn() };

  const executor = new ToolExecutorService(
    [],
    findRecordsService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    logicFunctionExecutorService as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  return { executor, findRecordsService, logicFunctionExecutorService };
};

const authContext = { workspaceId } as unknown as WorkspaceAuthContext;

const callerContext = (): ToolProviderContext => ({
  workspaceId,
  roleId: restrictedRoleId,
  rolePermissionConfig: { unionOf: [restrictedRoleId] },
  authContext,
  userId: 'caller-user-id',
  userWorkspaceId: 'caller-user-workspace-id',
});

describe('ToolExecutorService caller scoping', () => {
  it('runs a read-only app tool inside the caller workspace, ignoring a workspace id in tool args', async () => {
    const execute = jest.fn().mockResolvedValue({ data: { status: 'READ' } });
    const { executor, logicFunctionExecutorService } = buildExecutor({
      logicFunctionExecutorService: { execute },
    });

    const descriptor: ToolIndexEntry = {
      name: 'app_read_document',
      label: 'Read document',
      description: 'Read a document',
      category: ToolCategory.LOGIC_FUNCTION,
      executionRef: {
        kind: 'logic_function',
        logicFunctionId: 'logic-function-id',
      },
    };

    const output = await executor.dispatch(
      descriptor,
      {
        documentId: 'foreign-workspace-record-id',
        workspaceId: 'foreign-workspace-id',
      },
      callerContext(),
    );

    // The foreign record id is inert payload data; the execution is scoped to
    // the caller's workspace and identity, so the read can never cross tenants.
    expect(logicFunctionExecutorService.execute).toHaveBeenCalledWith({
      logicFunctionId: 'logic-function-id',
      workspaceId,
      payload: {
        documentId: 'foreign-workspace-record-id',
        workspaceId: 'foreign-workspace-id',
      },
      userId: 'caller-user-id',
      userWorkspaceId: 'caller-user-workspace-id',
    });
    expect(output.success).toBe(true);
  });

  it('scopes a database read to the caller role permission config so record-level rules decide the result', async () => {
    const emptyResult = {
      success: true,
      message: 'Found 0 document records',
      result: { records: [], count: 0, hasNextPage: false },
    };
    const execute = jest.fn().mockResolvedValue(emptyResult);
    const { executor, findRecordsService } = buildExecutor({
      findRecordsService: { execute },
    });

    const descriptor: ToolIndexEntry = {
      name: 'find_one_document',
      label: 'Find document',
      description: 'Find a document',
      category: ToolCategory.DATABASE_CRUD,
      executionRef: {
        kind: 'database_crud',
        objectNameSingular: 'document',
        operation: 'find_one',
      },
    };

    const output = await executor.dispatch(
      descriptor,
      { id: 'foreign-workspace-record-id' },
      callerContext(),
    );

    expect(findRecordsService.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: 'document',
        filter: { id: { eq: 'foreign-workspace-record-id' } },
        rolePermissionConfig: { unionOf: [restrictedRoleId] },
        authContext,
      }),
    );
    // An unauthorized or nonexistent record both surface as an empty result —
    // the executor adds no existence signal of its own.
    expect(output.result).toEqual(emptyResult.result);
  });
});
