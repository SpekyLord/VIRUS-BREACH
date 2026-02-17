import { useState, useEffect } from 'react';

export function useTimer(timerEndsAt, timerDuration = 60) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!timerEndsAt) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [timerEndsAt]);

  if (!timerEndsAt) return { secondsLeft: 0, percentage: 0 };

  const secondsLeft = Math.max(0, Math.ceil((timerEndsAt - now) / 1000));
  const totalSeconds = timerDuration;
  const percentage = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));

  return { secondsLeft, percentage };
}
