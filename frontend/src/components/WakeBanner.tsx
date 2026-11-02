import { useEffect, useState } from "react";

// Shown while a sleeping free server is starting up again.
export function WakeBanner() {
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    const on = () => setWaking(true);
    const off = () => setWaking(false);
    window.addEventListener("api:waking", on);
    window.addEventListener("api:awake", off);
    return () => {
      window.removeEventListener("api:waking", on);
      window.removeEventListener("api:awake", off);
    };
  }, []);

  if (!waking) return null;

  return (
    <div className="wake-banner" role="status">
      The server was asleep after a quiet period (free hosting) and is waking up. This takes up to a minute.
    </div>
  );
}
