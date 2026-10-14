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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "0.5rem",
        fontSize: "0.85rem",
        color: "#94a3b8",
        borderBottom: "1px solid #334155",
      }}
    >
      {statuses.map((s) => (
        <span key={s.code}>
          {s.name}: <span style={{ color: s.open ? "#22c55e" : "#ef4444" }}>●</span>{" "}
          {s.open ? "Open" : "Closed"}
        </span>
      ))}
    </div>
  );
}