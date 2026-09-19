import { useEffect, useState } from 'react';

import { useFocusPreferences } from '@/focus-preferences/hooks/useFocusPreferences';
import { PomodoroWidgetContent } from '@/home-dashboard/components/PomodoroWidgetContent';

export const PomodoroWidget = () => {
  const { focusPreferences } = useFocusPreferences();
  const focusDurationSeconds =
    focusPreferences.pomodoroFocusDurationMinutes * 60;

  const [secondsRemaining, setSecondsRemaining] =
    useState(focusDurationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusSessions, setCompletedFocusSessions] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setSecondsRemaining(focusDurationSeconds);
    }
  }, [focusDurationSeconds, isRunning]);

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
    setSecondsRemaining(focusDurationSeconds);
  }, [focusDurationSeconds, isRunning, secondsRemaining]);

  return (
    <PomodoroWidgetContent
      secondsRemaining={secondsRemaining}
      isRunning={isRunning}
      completedFocusSessions={completedFocusSessions}
      focusSessionTarget={focusPreferences.pomodoroSessionTarget}
      onStart={() => setIsRunning(true)}
      onPause={() => setIsRunning(false)}
      onReset={() => {
        setIsRunning(false);
        setSecondsRemaining(focusDurationSeconds);
      }}
    />
  );
};
