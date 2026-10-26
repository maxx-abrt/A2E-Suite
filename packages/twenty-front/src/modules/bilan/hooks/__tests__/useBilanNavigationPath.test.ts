import { useBilanNavigationPath } from '@/bilan/hooks/useBilanNavigationPath';
import { useReadableObjectMetadataItems } from '@/object-metadata/hooks/useReadableObjectMetadataItems';
import { useBilanPageLayouts } from '@/bilan/hooks/useBilanPageLayouts';
import { renderHook } from '@testing-library/react';

jest.mock('@/bilan/hooks/useBilanPageLayouts');
jest.mock('@/object-metadata/hooks/useReadableObjectMetadataItems', () => ({
  useReadableObjectMetadataItems: jest.fn(),
}));

beforeEach(() => {
  jest.mocked(useBilanPageLayouts).mockReturnValue([]);
  jest
    .mocked(useReadableObjectMetadataItems)
    .mockReturnValue({ readableObjectMetadataItems: [] });
});

it('opens the installed native Bilan dashboard using its workspace ID', () => {
  jest.mocked(useBilanPageLayouts).mockReturnValue([
    {
      id: 'workspace-layout-id',
      universalIdentifier: 'b11a0000-0014-4000-8000-000000000001',
    },
  ]);
  expect(renderHook(useBilanNavigationPath).result.current).toBe(
    '/page/workspace-layout-id',
  );
});

it('uses a readable invoice table when an older installation has no dashboard', () => {
  jest.mocked(useReadableObjectMetadataItems).mockReturnValue({
    readableObjectMetadataItems: [
      {
        universalIdentifier: 'b11a0100-0000-4000-8000-000000000000',
        namePlural: 'customInvoices',
      },
    ],
  } as ReturnType<typeof useReadableObjectMetadataItems>);
  expect(renderHook(useBilanNavigationPath).result.current).toBe(
    '/objects/customInvoices',
  );
});

it('does not invent an invoice route when Bilan is unavailable', () => {
  expect(renderHook(useBilanNavigationPath).result.current).toBeNull();
});
