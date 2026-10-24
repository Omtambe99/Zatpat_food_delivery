import { useState, useEffect } from "react";

/**
 * Custom hook to calculate remaining time until expiresAt
 * @param {string|Date} expiresAt - Expiration target date
 * @param {number} totalDurationMs - Total window duration (default 10 minutes)
 */
export const useCountdown = (expiresAt, totalDurationMs = 10 * 60 * 1000) => {
  const calculateRemaining = () => {
    if (!expiresAt) {
      return { totalMs: 0, secondsLeft: 0, minutes: 0, seconds: 0, formatted: "00:00", isExpired: true, progressPct: 0 };
    }
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      return { totalMs: 0, secondsLeft: 0, minutes: 0, seconds: 0, formatted: "00:00", isExpired: true, progressPct: 0 };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const progressPct = Math.min(100, Math.max(0, (diff / totalDurationMs) * 100));

    return {
      totalMs: diff,
      secondsLeft: totalSeconds,
      minutes: mins,
      seconds: secs,
      formatted,
      isExpired: false,
      progressPct
    };
  };

  const [remaining, setRemaining] = useState(calculateRemaining);

  useEffect(() => {
    setRemaining(calculateRemaining());
    const interval = setInterval(() => {
      const current = calculateRemaining();
      setRemaining(current);
      if (current.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return remaining;
};

export default useCountdown;
