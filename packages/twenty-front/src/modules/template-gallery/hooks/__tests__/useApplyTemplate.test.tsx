import { useApplyTemplate } from '@/template-gallery/hooks/useApplyTemplate';
import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { type TemplateGalleryItem } from '@/template-gallery/types/TemplateGalleryItem';
import { act, renderHook } from '@testing-library/react';

const mockExecute = jest.fn();
const mockAgendaApply = jest.fn();
const mockSynaApply = jest.fn();
jest.mock('@apollo/client/react', () => ({ useMutation: () => [mockExecute] }));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock('@/calendar/hooks/useAgendaTemplateApply', () => ({
  useAgendaTemplateApply: () => ({
    applyAgendaTemplateItem: mockAgendaApply,
    isApplying: false,
  }),
}));
jest.mock('@/ai/hooks/useSynaRecipeApply', () => ({
  useSynaRecipeApply: () => ({
    applySynaRecipeItem: mockSynaApply,
    isApplying: false,
  }),
}));
const applications = [
  { id: 'documents', universalIdentifier: 'documents-app', name: 'Bureau' },
];
const functions = [
  { id: 'apply', applicationId: 'documents', name: 'apply-template' },
];
const item = (key: string): TemplateGalleryItem => ({
  descriptor: {
    key,
    version: 1,
    category: 'Pages',
    labels: { fr: key, en: key },
    preview: [],
    requiredApps: [],
    inputs: [],
  },
  sourceApplication: { universalIdentifier: 'documents-app', name: 'Bureau' },
  available: true,
});
const applied = (key = 'journal') => ({
  data: {
    executeOneLogicFunction: {
      data: {
        status: 'applied',
        key,
        version: 1,
        operationId: 'operation',
        created: [{ object: 'document', id: 'page' }],
      },
    },
  },
});

describe('useApplyTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useAtomStateValue)
      .mockImplementation((state) =>
        state === applicationsSelector ? applications : functions,
      );
    mockExecute.mockResolvedValue(applied());
  });
  it('keeps retries idempotent while giving different templates separate identities', async () => {
    const { result } = renderHook(useApplyTemplate);
    await act(async () => {
      await result.current.applyTemplate(item('journal'));
      await result.current.applyTemplate(item('journal'));
      await result.current.applyTemplate(item('notes-de-reunion'));
    });
    const operationIds = mockExecute.mock.calls.map(
      ([request]) => request.variables.input.payload.operationId,
    );
    expect(operationIds[0]).toBe(operationIds[1]);
    expect(operationIds[0]).not.toBe(operationIds[2]);
  });
  it('coalesces rapid duplicate clicks into one write and keeps the pending state', async () => {
    let finish!: (value: ReturnType<typeof applied>) => void;
    mockExecute.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result } = renderHook(useApplyTemplate);
    let first!: ReturnType<typeof result.current.applyTemplate>;
    let second!: ReturnType<typeof result.current.applyTemplate>;
    act(() => {
      first = result.current.applyTemplate(item('journal'));
      second = result.current.applyTemplate(item('journal'));
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(result.current.isApplying).toBe(true);
    await act(async () => {
      finish(applied());
      await first;
    });
    expect(result.current.isApplying).toBe(false);
  });
  it('allows retry after a failed call using the same operation identity', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection lost'));
    const { result } = renderHook(useApplyTemplate);
    await act(async () => {
      expect(await result.current.applyTemplate(item('journal'))).toBeNull();
    });
    await act(async () => {
      expect(await result.current.applyTemplate(item('journal'))).toMatchObject(
        { status: 'applied' },
      );
    });
    expect(
      mockExecute.mock.calls[0][0].variables.input.payload.operationId,
    ).toBe(mockExecute.mock.calls[1][0].variables.input.payload.operationId);
  });
  it('rejects malformed results and missing installed apply functions without claiming success', async () => {
    mockExecute.mockResolvedValue({
      data: { executeOneLogicFunction: { data: { success: true } } },
    });
    const { result } = renderHook(useApplyTemplate);
    await act(async () => {
      expect(await result.current.applyTemplate(item('journal'))).toBeNull();
    });
    await act(async () => {
      expect(
        await result.current.applyTemplate({
          ...item('journal'),
          sourceApplication: {
            universalIdentifier: 'absent-app',
            name: 'Absent',
          },
        }),
      ).toBeNull();
    });
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });
});
