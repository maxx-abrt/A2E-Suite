import { useEffect, useState } from 'react';

import { PomodoroWidgetContent } from '@/home-dashboard/components/PomodoroWidgetContent';
import {
  POMODORO_FOCUS_DURATION_SECONDS,
  POMODORO_FOCUS_SESSION_TARGET,
} from '@/home-dashboard/utils/pomodoroTimer';

export const PomodoroWidget = () => {
  const [secondsRemaining, setSecondsRemaining] = useState(
    POMODORO_FOCUS_DURATION_SECONDS,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSecondsRemaining((previousSeconds) =>
        Math.max(0, previousSeconds - 1),
      );
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || secondsRemaining > 0) {
      return;
    }

    setIsRunning(false);
    setCompletedFocusSessions((completedSessions) => completedSessions + 1);
    setSecondsRemaining(POMODORO_FOCUS_DURATION_SECONDS);
  }, [isRunning, secondsRemaining]);

  return (
    <PomodoroWidgetContent
      secondsRemaining={secondsRemaining}
      isRunning={isRunning}
      completedFocusSessions={completedFocusSessions}
      focusSessionTarget={POMODORO_FOCUS_SESSION_TARGET}
      onStart={() => setIsRunning(true)}
      onPause={() => setIsRunning(false)}
      onReset={() => {
        setIsRunning(false);
        setSecondsRemaining(POMODORO_FOCUS_DURATION_SECONDS);
      }}
    />
  );
};
