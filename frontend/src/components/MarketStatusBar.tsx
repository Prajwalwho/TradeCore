import { useEffect, useState } from "react";
import { fetchMarketStatus, type MarketStatus } from "../lib/market-status-api";

export function MarketStatusBar() {
  const [statuses, setStatuses] = useState<MarketStatus[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const load = () => fetchMarketStatus().then(setStatuses).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

  return (
    <div className="market-status">
      <span className="clock">{time} IST</span>
      {statuses.map((s) => (
        <span key={s.code} className="status-chip">
          <i className={s.open ? "dot open" : "dot"} />
          {s.name} {s.open ? "open" : "closed"}
        </span>
      ))}
    </div>
  );
}
