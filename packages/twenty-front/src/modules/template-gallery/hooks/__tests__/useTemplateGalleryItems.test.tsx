import { applicationsSelector } from '@/applications/states/applicationsSelector';
import { useTemplateGalleryItems } from '@/template-gallery/hooks/useTemplateGalleryItems';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { act, renderHook, waitFor } from '@testing-library/react';

const mockExecute = jest.fn();
jest.mock('@apollo/client/react', () => ({ useMutation: () => [mockExecute] }));
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
const applications = [
  { id: 'pages', universalIdentifier: 'pages-app', name: 'Pages' },
  { id: 'projects', universalIdentifier: 'projects-app', name: 'Projects' },
];
const noApplications: typeof applications = [];
const functions = applications.map((application) => ({
  id: application.id,
  applicationId: application.id,
  name: 'list-template-descriptors',
}));
const descriptorResponse = (key: string) => ({
  data: {
    executeOneLogicFunction: {
      data: {
        templates: [
          {
            key,
            version: 1,
            category: 'Pages',
            labels: { fr: key, en: key },
            preview: [],
            requiredApps: [],
            inputs: [],
          },
        ],
      },
    },
  },
});

describe('useTemplateGalleryItems', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useAtomStateValue)
      .mockImplementation((state) =>
        state === applicationsSelector ? applications : functions,
      );
  });
  it('loads independent apps together, retains successful templates and offers a real retry', async () => {
    let finishPages!: (value: ReturnType<typeof descriptorResponse>) => void;
    mockExecute.mockImplementation(({ variables }) =>
      variables.input.id === 'pages'
        ? new Promise((resolve) => {
            finishPages = resolve;
          })
        : Promise.reject(new Error('Offline')),
    );
    const { result } = renderHook(useTemplateGalleryItems);
    expect(mockExecute).toHaveBeenCalledTimes(2);
    await act(async () => {
      finishPages(descriptorResponse('journal'));
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasError).toBe(true);
    expect(
      result.current.items.some((item) => item.descriptor.key === 'journal'),
    ).toBe(true);
    mockExecute.mockImplementation(async ({ variables }) =>
      descriptorResponse(variables.input.id),
    );
    act(() => result.current.retry());
    await waitFor(() =>
      expect(
        result.current.items.some((item) => item.descriptor.key === 'projects'),
      ).toBe(true),
    );
    expect(result.current.hasError).toBe(false);
  });
  it('drops removed apps immediately while their replacement load is pending', async () => {
    mockExecute.mockImplementation(async ({ variables }) =>
      descriptorResponse(variables.input.id),
    );
    const { result, rerender } = renderHook(useTemplateGalleryItems);
    await waitFor(() =>
      expect(
        result.current.items.some((item) => item.descriptor.key === 'pages'),
      ).toBe(true),
    );
    jest
      .mocked(useAtomStateValue)
      .mockImplementation((state) =>
        state === applicationsSelector ? noApplications : functions,
      );
    rerender();
    expect(
      result.current.items.some(
        (item) => item.sourceApplication.universalIdentifier === 'pages-app',
      ),
    ).toBe(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});
