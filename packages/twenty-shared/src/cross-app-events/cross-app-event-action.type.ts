// The lifecycle verbs of the cross-app contract (C5). `completed` is a
// semantic upgrade of an update (e.g. a task reaching its done status), not a
// raw database action, so consumers express intent instead of field diffs.
export type CrossAppEventAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'deleted';
