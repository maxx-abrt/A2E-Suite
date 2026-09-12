import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

/**
 * Daily catalogue refresh. Runs at 04:15 UTC — outside French office hours,
 * after Aides-territoires' own nightly publication window. The job is resumable
 * (page by page) and idempotent (upsert keyed by source + sourceId), so a
 * partial run simply continues the next day without duplicating anything.
 */
const crons = cronJobs()

crons.daily(
  "refresh subventions catalogue",
  { hourUTC: 4, minuteUTC: 15 },
  internal.a2e_subventions.refreshAll,
  {},
)

export default crons
