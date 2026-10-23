import { useBureauTodayProgress } from '@/bureau/hooks/useBureauTodayProgress';
import { useAggregateRecords } from '@/object-record/hooks/useAggregateRecords';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import {
  UserContext,
  type UserContextType,
} from '@/users/contexts/UserContext';
import { act, renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';

jest.mock('@/object-record/hooks/useAggregateRecords', () => ({
  useAggregateRecords: jest.fn(),
}));
jest.mock('@/object-metadata/hooks/useObjectMetadataItem');
jest.mock('@/ui/utilities/state/jotai/hooks/useAtomStateValue');

const mockedUseAggregate = jest.mocked(useAggregateRecords);
const mockedUseMember = jest.mocked(useAtomStateValue);
const mockedUseObject = jest.mocked(useObjectMetadataItem);

const Wrapper = ({ children }: { children: ReactNode }) => (
  <UserContext.Provider value={{ timeZone: 'Europe/Paris' } as UserContextType}>
    {children}
  </UserContext.Provider>
);

describe('useBureauTodayProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    jest.clearAllMocks();
    mockedUseMember.mockReturnValue({ id: 'member-one' });
    mockedUseObject.mockReturnValue({
      objectMetadataItem: { readableFields: [] },
    } as unknown as ReturnType<typeof useObjectMetadataItem>);
    mockedUseAggregate.mockImplementation(
      ({ filter }) =>
        ({
          data: { id: { COUNT: filter && 'status' in filter ? 4 : 10 } },
          loading: false,
          error: undefined,
        }) as unknown as ReturnType<typeof useAggregateRecords>,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('counts every assigned task due today in the member time zone, including a DST change', () => {
    const { result } = renderHook(useBureauTodayProgress, { wrapper: Wrapper });

    expect(mockedUseAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          assigneeId: { eq: 'member-one' },
          and: [
            { dueAt: { gte: '2026-10-24T22:00:00Z' } },
            { dueAt: { lt: '2026-10-25T23:00:00Z' } },
          ],
        },
        skip: false,
      }),
    );
    expect(mockedUseAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ status: { eq: 'DONE' } }),
      }),
    );
    expect(result.current).toEqual({
      totalCount: 10,
      completedCount: 4,
      isLoading: false,
      hasError: false,
    });
  });

  it('skips queries until a workspace member is known', () => {
    mockedUseMember.mockReturnValue(null);
    const { result } = renderHook(useBureauTodayProgress, { wrapper: Wrapper });

    expect(mockedUseAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ skip: true }),
    );
    expect(result.current.isLoading).toBe(true);
  });

  it('advances to the next day while home stays open', () => {
    renderHook(useBureauTodayProgress, { wrapper: Wrapper });

    act(() => {
      jest.advanceTimersByTime(13 * 60 * 60 * 1000 + 1);
    });

    expect(mockedUseAggregate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          and: [
            { dueAt: { gte: '2026-10-25T23:00:00Z' } },
            { dueAt: { lt: '2026-10-26T23:00:00Z' } },
          ],
        }),
      }),
    );
  });

  it('matches Projects completion, with native status used only when the app pipeline is unset', () => {
    mockedUseObject.mockReturnValue({
      objectMetadataItem: { readableFields: [{ name: 'projectStatus' }] },
    } as unknown as ReturnType<typeof useObjectMetadataItem>);
    renderHook(useBureauTodayProgress, { wrapper: Wrapper });

    expect(mockedUseAggregate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({
          or: [
            { projectStatus: { eq: 'DONE' } },
            {
              and: [
                { projectStatus: { is: 'NULL' } },
                { status: { eq: 'DONE' } },
              ],
            },
          ],
        }),
      }),
    );
  });
});
