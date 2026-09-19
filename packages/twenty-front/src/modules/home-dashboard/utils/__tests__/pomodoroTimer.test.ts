import { formatPomodoroClock } from '@/home-dashboard/utils/pomodoroTimer';

describe('formatPomodoroClock', () => {
  it('formats a full focus session as mm:ss', () => {
    expect(formatPomodoroClock(1500)).toBe('25:00');
  });

  it('pads seconds below ten', () => {
    expect(formatPomodoroClock(65)).toBe('01:05');
  });

  it('clamps negative input to zero', () => {
    expect(formatPomodoroClock(-12)).toBe('00:00');
  });
});
