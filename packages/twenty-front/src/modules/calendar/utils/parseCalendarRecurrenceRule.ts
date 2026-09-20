// Isomorphic recurrence engine lives in twenty-shared so the server stored-path
// expansion consumes the exact same rule/expansion code as the front. Re-export
// only — no logic is forked here.
export { parseCalendarRecurrenceRule } from 'twenty-shared/utils';
