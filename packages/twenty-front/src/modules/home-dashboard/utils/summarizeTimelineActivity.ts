import {
  isTimelineActivityAction,
  type TimelineActivityAction,
} from 'twenty-shared/timeline';

export type TimelineActivitySummary = {
  objectNameSingular: string | null;
  action: TimelineActivityAction;
};

// Timeline activity names are `<objectNameSingular>.<action>` (see
// parseTimelineActivityAction); the workspace feed needs the object part too.
export const summarizeTimelineActivity = (
  name: string | null | undefined,
): TimelineActivitySummary => {
  const [objectNameSingular, action] = (name ?? '').split('.');

  return {
    objectNameSingular:
      objectNameSingular !== undefined && objectNameSingular.length > 0
        ? objectNameSingular
        : null,
    action: isTimelineActivityAction(action) ? action : 'linked',
  };
};
