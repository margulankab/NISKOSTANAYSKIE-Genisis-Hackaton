import { useEffect, useState } from 'react';

/** Decorative top strip: a recording light and the local time, in the GENESIS terminal style. */
export function StatusBar() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const clock = time.toLocaleTimeString('en-GB', { hour12: false });
  return (
    <div className="statusbar" aria-hidden="true">
      <span><i className="rec-dot" /> REC MEMORY_00 · LIVE</span>
      <span>{clock}</span>
    </div>
  );
}
