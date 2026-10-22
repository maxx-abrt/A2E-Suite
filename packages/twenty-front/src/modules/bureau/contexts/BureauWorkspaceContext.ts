import { type useBureauWorkspaceValue } from '@/bureau/hooks/useBureauWorkspaceValue';
import { createContext } from 'react';

export type BureauWorkspaceContextValue = ReturnType<
  typeof useBureauWorkspaceValue
>;

export const BureauWorkspaceContext =
  createContext<BureauWorkspaceContextValue | null>(null);
