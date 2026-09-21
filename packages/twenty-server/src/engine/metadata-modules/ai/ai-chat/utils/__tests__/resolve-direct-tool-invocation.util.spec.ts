import { ToolCategory } from 'twenty-shared/ai';

import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { resolveDirectToolInvocation } from 'src/engine/metadata-modules/ai/ai-chat/utils/resolve-direct-tool-invocation.util';

const buildCatalogEntry = (
  name: string,
  category: ToolCategory,
): ToolIndexEntry => ({
  name,
  label: name,
  description: `${name} description`,
  category,
  executionRef: { kind: 'logic_function', logicFunctionId: `${name}-id` },
});

const CATALOG: ToolIndexEntry[] = [
  buildCatalogEntry('summarize_document', ToolCategory.LOGIC_FUNCTION),
  buildCatalogEntry('create_task', ToolCategory.DATABASE_CRUD),
];

describe('resolveDirectToolInvocation', () => {
  it('forces a read-only tool that resolves in the caller catalogue', () => {
    const decision = resolveDirectToolInvocation({
      directToolInvocation: 'summarize_document',
      toolCatalog: CATALOG,
    });

    expect(decision).toEqual({
      kind: 'force',
      toolName: 'summarize_document',
    });
  });

  it('reports none when no direct invocation is requested', () => {
    expect(
      resolveDirectToolInvocation({
        directToolInvocation: null,
        toolCatalog: CATALOG,
      }),
    ).toEqual({ kind: 'none' });

    expect(
      resolveDirectToolInvocation({
        directToolInvocation: undefined,
        toolCatalog: CATALOG,
      }),
    ).toEqual({ kind: 'none' });

    expect(
      resolveDirectToolInvocation({
        directToolInvocation: '',
        toolCatalog: CATALOG,
      }),
    ).toEqual({ kind: 'none' });
  });

  it.each([
    ['unknown tool', 'does_not_exist'],
    ['uninstalled-app tool', 'app_not_installed_tool'],
    ['restricted-member tool', 'admin_only_tool'],
    ['cross-workspace tool', 'app_foreign_workspace_tool'],
  ])(
    'refuses a %s the caller catalogue never exposes with the same single decision',
    (_denialCase, toolName) => {
      expect(
        resolveDirectToolInvocation({
          directToolInvocation: toolName,
          toolCatalog: CATALOG,
        }),
      ).toEqual({ kind: 'refuse' });
    },
  );

  it('skips a mutating-category tool instead of forcing an execution', () => {
    expect(
      resolveDirectToolInvocation({
        directToolInvocation: 'create_task',
        toolCatalog: CATALOG,
      }),
    ).toEqual({ kind: 'skip-mutating' });
  });
});
