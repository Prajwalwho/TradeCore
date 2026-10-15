import type { CSSProperties } from "react";
import { useLivePrices } from "../hooks/useLivePrices";
import type { PricePoint } from "../lib/market-api";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = { items: PricePoint[]; reserve?: boolean };

// The scrolling band of prices. The list is shown twice so the loop has no visible jump.
// With reserve set, the band keeps its space while prices are still loading, so the page below never jumps.
export function TickerTapeView({ items, reserve = false }: Props) {
  const rows = items.filter((p) => p.previousClose).sort((a, b) => a.symbol.localeCompare(b.symbol));
  if (rows.length === 0) return reserve ? <div className="tape" /> : null;

  const list = [...rows, ...rows];
  const style = { "--tape-duration": `${rows.length * 3.5}s` } as CSSProperties;

  return (
    <div className="tape" aria-label="Live prices">
      <div className="tape-track" style={style}>
        {list.map((p, i) => {
          const prev = p.previousClose as number;
          const pct = ((p.price - prev) / prev) * 100;
          const up = pct >= 0;
          return (
            <span key={`${p.symbol}-${i}`} className="tape-item">
              <b>{p.symbol}</b>
              <span>₹{fmt(p.price)}</span>
              <span className={up ? "tape-up" : "tape-down"}>
                {up ? "▲" : "▼"} {Math.abs(pct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TickerTape() {
  const prices = useLivePrices();
  return <TickerTapeView items={Object.values(prices)} reserve />;
}
