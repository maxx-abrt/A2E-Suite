export type HomeGreetingPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';

// Uses the local clock the user sees, not UTC, so the greeting matches the
// time printed next to it.
export const getHomeGreetingPeriod = (date: Date): HomeGreetingPeriod => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'MORNING';
  }

  if (hour >= 12 && hour < 18) {
    return 'AFTERNOON';
  }

  return 'EVENING';
};
