import { useEffect, useState } from "react";
import { fetchIndices, type IndexPoint } from "../lib/watchlist-api";

export function IndexTicker() {
  const [indices, setIndices] = useState<IndexPoint[]>([]);

  useEffect(() => {
    const load = () => fetchIndices().then(setIndices).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  if (indices.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "2.5rem",
        padding: "0.6rem",
        background: "#162032",
        borderBottom: "1px solid #334155",
        fontSize: "0.9rem",
      }}
    >
      {indices.map((ix) => {
        const change = ix.previousClose ? ix.price - ix.previousClose : null;
        const pct = change !== null && ix.previousClose ? (change / ix.previousClose) * 100 : null;
        const color = change === null ? "#94a3b8" : change >= 0 ? "#22c55e" : "#ef4444";
        return (
          <div key={ix.symbol} style={{ textAlign: "center" }}>
            <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{ix.name}</div>
            <div style={{ color, fontWeight: 600 }}>
              {ix.price.toFixed(2)}
              {change !== null && pct !== null && (
                <span style={{ marginLeft: "0.5rem", fontWeight: 400 }}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}