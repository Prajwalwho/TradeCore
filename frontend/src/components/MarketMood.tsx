import { useLivePrices } from "../hooks/useLivePrices";

// Bull or bear? How many tracked stocks are above or below their previous close.
// The slot is always rendered, so the strip never shifts while prices load.
export function MarketMood() {
  const prices = useLivePrices();
  const rows = Object.values(prices).filter((p) => p.previousClose);
  if (rows.length < 3) return <div className="mood" />;

  const up = rows.filter((p) => p.price > (p.previousClose as number)).length;
  const down = rows.filter((p) => p.price < (p.previousClose as number)).length;
  const pct = Math.round((up / rows.length) * 100);
  const mood = pct >= 55 ? "bull" : pct <= 45 ? "bear" : "flat";
  const label = mood === "bull" ? "Bullish market" : mood === "bear" ? "Bearish market" : "Mixed market";

  return (
    <div className="mood" title="Bulls: stocks above their previous close. Bears: stocks below it.">
      <span className={mood === "bull" ? "mood-icon on" : "mood-icon"}>🐂</span>
      <div className="mood-mid">
        <div className={`mood-label ${mood}`}>{label}</div>
        <div className="mood-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="mood-split">
          <span className="up">{up} up</span>
          <span className="down">{down} down</span>
        </div>
      </div>
      <span className={mood === "bear" ? "mood-icon on" : "mood-icon"}>🐻</span>
    </div>
  );
}
