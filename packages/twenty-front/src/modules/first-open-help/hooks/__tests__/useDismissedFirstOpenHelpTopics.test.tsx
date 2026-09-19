import {
  currentUserState,
  type CurrentUser,
} from '@/auth/states/currentUserState';
import { useDismissedFirstOpenHelpTopics } from '@/first-open-help/hooks/useDismissedFirstOpenHelpTopics';
import { dismissedFirstOpenHelpTopicsState } from '@/first-open-help/states/dismissedFirstOpenHelpTopicsState';
import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { type ReactNode } from 'react';

const getWrapper =
  (store = createStore()) =>
  ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

describe('useDismissedFirstOpenHelpTopics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores dismissals per user and restores them', () => {
    const store = createStore();
    store.set(currentUserState.atom, { id: 'user-1' } as CurrentUser);

    const { result } = renderHook(() => useDismissedFirstOpenHelpTopics(), {
      wrapper: getWrapper(store),
    });

    expect(result.current.dismissedTopicIds).toEqual([]);

    act(() => {
      result.current.dismissTopic('topic-a');
    });

    expect(result.current.dismissedTopicIds).toEqual(['topic-a']);
    expect(store.get(dismissedFirstOpenHelpTopicsState.atom)).toEqual({
      'user-1': ['topic-a'],
    });

    act(() => {
      result.current.restoreTopic('topic-a');
    });

    expect(result.current.dismissedTopicIds).toEqual([]);
  });

  it('clears every dismissal for the user', () => {
    const store = createStore();
    store.set(currentUserState.atom, { id: 'user-1' } as CurrentUser);

    const { result } = renderHook(() => useDismissedFirstOpenHelpTopics(), {
      wrapper: getWrapper(store),
    });

    act(() => {
      result.current.dismissTopic('topic-a');
      result.current.dismissTopic('topic-b');
    });

    expect(result.current.dismissedTopicIds).toEqual(['topic-a', 'topic-b']);

    act(() => {
      result.current.restoreAllTopics();
    });

    expect(result.current.dismissedTopicIds).toEqual([]);
    expect(store.get(dismissedFirstOpenHelpTopicsState.atom)).toEqual({});
  });

  it('does nothing when no user is signed in', () => {
    const store = createStore();
    store.set(currentUserState.atom, null);

    const { result } = renderHook(() => useDismissedFirstOpenHelpTopics(), {
      wrapper: getWrapper(store),
    });

    act(() => {
      result.current.dismissTopic('topic-a');
    });

    expect(result.current.dismissedTopicIds).toEqual([]);
    expect(store.get(dismissedFirstOpenHelpTopicsState.atom)).toEqual({});
  });
});
