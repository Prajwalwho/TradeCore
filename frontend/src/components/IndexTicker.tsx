import { useEffect, useState } from "react";
import { fetchIndices, type IndexPoint } from "../lib/watchlist-api";
import { PriceCell } from "./PriceCell";

export function IndexTicker() {
  const [indices, setIndices] = useState<IndexPoint[]>([]);

  useEffect(() => {
    const load = () => fetchIndices().then(setIndices).catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  if (indices.length === 0) return <div className="index-ticker" />;

  return (
    <div className="index-ticker">
      {indices.map((ix) => {
        const change = ix.previousClose ? ix.price - ix.previousClose : null;
        const pct = change !== null && ix.previousClose ? (change / ix.previousClose) * 100 : null;
        return (
          <div key={ix.symbol} className="index-item">
            <span className="index-name">{ix.name}</span>
            <span className="index-price">
              <PriceCell value={ix.price} />
            </span>
            {change !== null && pct !== null && (
              <span className={`pill ${change >= 0 ? "up" : "down"}`}>
                {change >= 0 ? "+" : "−"}
                {Math.abs(change).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
