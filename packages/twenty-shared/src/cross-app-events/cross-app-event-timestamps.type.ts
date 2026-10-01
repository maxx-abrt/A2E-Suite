// ISO-8601 timestamps of the lifecycle event. `occurredAt` is the domain
// moment the event describes (used for digest windows and ordering);
// createdAt/updatedAt are the record's own column values when known.
export type CrossAppEventTimestamps = {
  occurredAt: string;
  createdAt: string | null;
  updatedAt: string | null;
};
