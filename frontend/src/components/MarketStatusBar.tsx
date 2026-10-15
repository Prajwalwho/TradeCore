import { useEffect, useState } from "react";
import { fetchMarketStatus, type MarketStatus } from "../lib/market-status-api";

export function MarketStatusBar() {
  const [statuses, setStatuses] = useState<MarketStatus[]>([]);

  useEffect(() => {
    const load = () => fetchMarketStatus().then(setStatuses).catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (statuses.length === 0) return null;

  return (
    <div className="market-status">
      {statuses.map((s) => (
        <span key={s.code} className="status-chip">
          <i className={s.open ? "dot open" : "dot"} />
          {s.name} {s.open ? "open" : "closed"}
        </span>
      ))}
    </div>
  );
}
