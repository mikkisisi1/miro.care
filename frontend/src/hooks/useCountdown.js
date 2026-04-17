import { useState, useEffect, useRef } from 'react';

export default function useCountdown(minutesLeft, hasMinutes, isFreePhase) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Activate countdown only in last 5 minutes of paid session
    if (isFreePhase || !hasMinutes || minutesLeft > 5) {
      setSecondsLeft(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setSecondsLeft(minutesLeft * 60);

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 0) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [minutesLeft, hasMinutes, isFreePhase]);

  return secondsLeft;
}
