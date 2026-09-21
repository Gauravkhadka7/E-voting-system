import React, { useState, useEffect } from "react";

function pad(n) {
  return String(n).padStart(2, "0");
}

export default function CountdownTimer({ targetDate, label = "Ends in", onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) {
        setExpired(true);
        onExpire?.();
        return null;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      return { d, h, m, s };
    }

    setTimeLeft(calc());
    const interval = setInterval(() => {
      const t = calc();
      if (!t) { clearInterval(interval); return; }
      setTimeLeft(t);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (expired) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 border border-red-700/40 rounded-lg">
        <div className="w-2 h-2 bg-red-400 rounded-full" />
        <span className="text-sm font-medium text-red-400">Ended</span>
      </div>
    );
  }

  if (!timeLeft) return null;

  const segments = [
    { value: timeLeft.d, label: "Days" },
    { value: timeLeft.h, label: "Hrs" },
    { value: timeLeft.m, label: "Min" },
    { value: timeLeft.s, label: "Sec" },
  ].filter((s, i) => i > 0 || timeLeft.d > 0);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        {segments.map((seg, i) => (
          <React.Fragment key={seg.label}>
            {i > 0 && <span className="text-slate-500 text-sm">:</span>}
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded min-w-[28px] text-center">
                {pad(seg.value)}
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">{seg.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}