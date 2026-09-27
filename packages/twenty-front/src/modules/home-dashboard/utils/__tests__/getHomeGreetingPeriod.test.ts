import { getHomeGreetingPeriod } from '@/home-dashboard/utils/getHomeGreetingPeriod';

const atLocalHour = (hour: number, minute = 0) =>
  new Date(2026, 8, 26, hour, minute);

describe('getHomeGreetingPeriod', () => {
  it('greets the morning from 05:00 until noon', () => {
    expect(getHomeGreetingPeriod(atLocalHour(5))).toBe('MORNING');
    expect(getHomeGreetingPeriod(atLocalHour(11, 59))).toBe('MORNING');
  });

  it('greets the afternoon from noon until 18:00', () => {
    expect(getHomeGreetingPeriod(atLocalHour(12))).toBe('AFTERNOON');
    expect(getHomeGreetingPeriod(atLocalHour(17, 59))).toBe('AFTERNOON');
  });

  it('greets the evening from 18:00 and through the night', () => {
    expect(getHomeGreetingPeriod(atLocalHour(18))).toBe('EVENING');
    expect(getHomeGreetingPeriod(atLocalHour(23, 30))).toBe('EVENING');
    expect(getHomeGreetingPeriod(atLocalHour(0))).toBe('EVENING');
    expect(getHomeGreetingPeriod(atLocalHour(4, 59))).toBe('EVENING');
  });
});
