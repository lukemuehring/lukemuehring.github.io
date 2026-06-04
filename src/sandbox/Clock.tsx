import { useEffect, useState } from "react";

// Lesson 4 — what cleanup is for, made visible.
// Open the console and watch the "tick" logs. Each interval logs its own id.

// ✅ Proper cleanup: clearInterval on unmount (and before any re-run).
function SafeClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      console.log("[SafeClock] tick — interval", id);
    }, 1000);
    return () => {
      console.log("[SafeClock] clearInterval", id);
      clearInterval(id);
    };
  }, []);

  return <div style={{ fontVariantNumeric: "tabular-nums" }}>🟢 Safe clock: {time}</div>;
}

// ❌ No cleanup on purpose. The interval keeps running after unmount, and every
// remount starts ANOTHER one — they pile up. (And because of StrictMode, in dev
// it starts with TWO tickers immediately, since the missing cleanup is exactly
// what StrictMode is designed to expose.)
function LeakyClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      console.log("[LeakyClock] tick — interval", id);
    }, 1000);
    // intentionally NO `return () => clearInterval(id)`
  }, []);

  return <div style={{ fontVariantNumeric: "tabular-nums" }}>🔴 Leaky clock: {time}</div>;
}

export default function ClockDemo() {
  const [showSafe, setShowSafe] = useState(true);
  const [showLeaky, setShowLeaky] = useState(true);

  return (
    <div>
      <p style={{ maxWidth: 600 }}>
        Open the browser console. Each clock logs a <code>tick</code> every second with its
        interval id. Toggle each clock off and on a few times, then compare the console:
        the <strong>safe</strong> clock always has exactly one ticker (the id changes on each
        remount, the old one is cleared); the <strong>leaky</strong> clock keeps every old
        ticker running and stacks a new one on each remount.
      </p>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <button onClick={() => setShowSafe((s) => !s)}>
          {showSafe ? "Unmount" : "Mount"} safe clock
        </button>
        <button onClick={() => setShowLeaky((s) => !s)}>
          {showLeaky ? "Unmount" : "Mount"} leaky clock
        </button>
      </div>
      {showSafe && <SafeClock />}
      {showLeaky && <LeakyClock />}
    </div>
  );
}
