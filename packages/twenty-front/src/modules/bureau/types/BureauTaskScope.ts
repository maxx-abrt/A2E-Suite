export const BUREAU_TASK_SCOPES = [
  'mine',
  'today',
  'upcoming',
  'overdue',
  'all',
] as const;

export type BureauTaskScope = (typeof BUREAU_TASK_SCOPES)[number] | 'view';
