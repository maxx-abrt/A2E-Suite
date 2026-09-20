import { type BrowsingContext } from '@/ai/types/BrowsingContext';
import { type ContextToolButton } from '@/ai/types/ContextToolButton';
import {
  type DirectToolDispatch,
  type DirectToolInvocation,
} from '@/ai/types/DirectToolInvocation';
import { executeDirectContextTool } from '@/ai/utils/executeDirectContextTool';

const recordPageContext: BrowsingContext = {
  type: 'recordPage',
  objectNameSingular: 'document',
  recordId: 'document-record-id',
};

const readOnlyButton = (
  overrides: Partial<ContextToolButton> = {},
): ContextToolButton => ({
  toolName: 'app_document_content',
  label: 'Document Content',
  description: 'Reads a document.',
  applicationId: 'documents-app-id',
  readOnly: true,
  requiresConfirmation: false,
  inputSchema: {
    type: 'object',
    properties: { documentId: { type: 'string' } },
    required: ['documentId'],
  },
  ...overrides,
});

const expectedInvocation: DirectToolInvocation = {
  toolName: 'app_document_content',
  arguments: { documentId: 'document-record-id' },
};

describe('executeDirectContextTool', () => {
  it('dispatches the built invocation and returns the result (happy path)', async () => {
    const dispatch: DirectToolDispatch = jest
      .fn()
      .mockResolvedValue({ success: true, result: { content: 'hello' } });

    const outcome = await executeDirectContextTool({
      contextToolButton: readOnlyButton(),
      browsingContext: recordPageContext,
      dispatch,
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(expectedInvocation);
    expect(outcome).toEqual({
      status: 'executed',
      result: { content: 'hello' },
    });
  });

  it('surfaces the app fail-closed error when the dispatch rejects (unauthorized target)', async () => {
    const dispatch: DirectToolDispatch = jest
      .fn()
      .mockRejectedValue(new Error('DOCUMENT_NOT_FOUND'));

    const outcome = await executeDirectContextTool({
      contextToolButton: readOnlyButton(),
      browsingContext: recordPageContext,
      dispatch,
    });

    expect(outcome).toEqual({
      status: 'failed',
      message: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('surfaces the app fail-closed error when the dispatch reports failure (missing target)', async () => {
    const dispatch: DirectToolDispatch = jest
      .fn()
      .mockResolvedValue({ success: false, error: 'DOCUMENT_NOT_FOUND' });

    const outcome = await executeDirectContextTool({
      contextToolButton: readOnlyButton(),
      browsingContext: recordPageContext,
      dispatch,
    });

    expect(outcome).toEqual({
      status: 'failed',
      message: 'DOCUMENT_NOT_FOUND',
    });
  });

  it('never dispatches a mutating tool (refusal, C6)', async () => {
    const dispatch: DirectToolDispatch = jest.fn();

    const outcome = await executeDirectContextTool({
      contextToolButton: readOnlyButton({
        readOnly: false,
        requiresConfirmation: true,
      }),
      browsingContext: recordPageContext,
      dispatch,
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'refused',
        reason: 'MUTATING_TOOL_NOT_DIRECTLY_EXECUTABLE',
      }),
    );
  });

  it('never dispatches when the browsing context is missing', async () => {
    const dispatch: DirectToolDispatch = jest.fn();

    const outcome = await executeDirectContextTool({
      contextToolButton: readOnlyButton(),
      browsingContext: null,
      dispatch,
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(outcome).toEqual(
      expect.objectContaining({
        status: 'refused',
        reason: 'NO_BROWSING_CONTEXT',
      }),
    );
  });
});
