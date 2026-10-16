import { useEffect, useState } from "react";
import { fetchStats, type StockStats as Stats } from "../lib/stats-api";
import "./StockStats.css";

const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function StockStats({ symbol }: { symbol: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    setStats(null);
    const load = () => fetchStats(symbol).then(setStats).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [symbol]);

  if (!stats) {
    return <div className="stats-panel"><p className="stats-loading">Loading stats...</p></div>;
  }

  const dir = stats.change === null ? "" : stats.change >= 0 ? "up" : "down";
  const sign = stats.change !== null && stats.change >= 0 ? "+" : "";

  const items: { label: string; value: string; cls?: string }[] = [
    { label: "Open", value: fmt(stats.open) },
    { label: "High", value: fmt(stats.high) },
    { label: "Low", value: fmt(stats.low) },
    { label: "Prev close", value: fmt(stats.previousClose) },
    { label: "Last price", value: fmt(stats.last) },
    { label: "Change", value: stats.change === null ? "—" : `${sign}${stats.change.toFixed(2)}`, cls: dir },
    {
      label: "Change %",
      value: stats.changePct === null ? "—" : `${sign}${stats.changePct.toFixed(2)}%`,
      cls: dir,
    },
    { label: "Volume", value: stats.volume === null ? "—" : stats.volume.toLocaleString() },
    { label: "52W high", value: fmt(stats.fiftyTwoWeekHigh) },
    { label: "52W low", value: fmt(stats.fiftyTwoWeekLow) },
    {
      label: "Bid qty",
      value: `${stats.bidQty.toLocaleString()}${stats.bestBid !== null ? ` @ ${stats.bestBid.toFixed(2)}` : ""}`,
    },
    {
      label: "Ask qty",
      value: `${stats.askQty.toLocaleString()}${stats.bestAsk !== null ? ` @ ${stats.bestAsk.toFixed(2)}` : ""}`,
    },
  ];

  return (
    <div className="stats-panel">
      {items.map((it) => (
        <div key={it.label} className="stat">
          <span className="stat-label">{it.label}</span>
          <span className={`stat-value ${it.cls ?? ""}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}