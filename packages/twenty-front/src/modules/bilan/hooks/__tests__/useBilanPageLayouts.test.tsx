import { useBilanPageLayouts } from '@/bilan/hooks/useBilanPageLayouts';
import { A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER } from '@/quick-create/constants/A2eAccountingApplicationUniversalIdentifier';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useQuery } from '@apollo/client/react';
import { renderHook } from '@testing-library/react';

jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');
jest.mock('@apollo/client/react', () => ({ useQuery: jest.fn() }));
it('loads standalone links only when Bilan is installed, without relying on the record-layout store', () => {
  jest
    .mocked(useAtomStateValue)
    .mockReturnValue([
      { universalIdentifier: A2E_ACCOUNTING_APPLICATION_UNIVERSAL_IDENTIFIER },
    ]);
  jest.mocked(useQuery).mockReturnValue({
    data: {
      getPageLayouts: [
        { id: 'dashboard', universalIdentifier: 'bilan-dashboard' },
      ],
    },
  } as unknown as ReturnType<typeof useQuery>);
  const { result, rerender } = renderHook(useBilanPageLayouts);
  expect(result.current).toEqual([
    { id: 'dashboard', universalIdentifier: 'bilan-dashboard' },
  ]);
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), { skip: false });
  jest.mocked(useAtomStateValue).mockReturnValue([]);
  rerender();
  expect(useQuery).toHaveBeenLastCalledWith(expect.anything(), { skip: true });
  expect(result.current).toEqual([]);
});
