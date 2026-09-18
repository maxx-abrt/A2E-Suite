import { summarizeTimelineActivity } from '@/home-dashboard/utils/summarizeTimelineActivity';

describe('summarizeTimelineActivity', () => {
  it('splits the object name and a known action', () => {
    expect(summarizeTimelineActivity('company.created')).toEqual({
      objectNameSingular: 'company',
      action: 'created',
    });
  });

  it('falls back to linked for an unknown action', () => {
    expect(summarizeTimelineActivity('calendarEvent.frobnicated')).toEqual({
      objectNameSingular: 'calendarEvent',
      action: 'linked',
    });
  });

  it('falls back to linked and a null object for malformed names', () => {
    expect(summarizeTimelineActivity(null)).toEqual({
      objectNameSingular: null,
      action: 'linked',
    });
    expect(summarizeTimelineActivity('')).toEqual({
      objectNameSingular: null,
      action: 'linked',
    });
    expect(summarizeTimelineActivity('justonepart')).toEqual({
      objectNameSingular: 'justonepart',
      action: 'linked',
    });
  });
});
