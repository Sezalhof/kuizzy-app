// src/components/tests/TestCountdown.jsx
import React, { useEffect, useState } from "react";

export default function TestCountdown({ durationSeconds, onCountdownEnd }) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onCountdownEnd?.();
      return;
    }

    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, onCountdownEnd]);

  return (
    <div className="text-center font-mono text-lg">
      Time Remaining: {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}
    </div>
  );
}
