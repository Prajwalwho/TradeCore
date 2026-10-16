import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLivePrices } from "../hooks/useLivePrices";
import { fetchMarketMap, type MapStock } from "../lib/tools-api";
import { inr } from "../lib/format";

const NEUTRAL = "#566074";
const GREEN = "#0aa56f";
const RED = "#dd4146";

// A bigger move gives a stronger shade; a move of about 3% or more is fully colored.
function tileColor(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 0.05) return NEUTRAL;
  const strength = Math.min(Math.abs(pct) / 3, 1);
  const mix = Math.round(25 + strength * 75);
  return `color-mix(in srgb, ${NEUTRAL} ${100 - mix}%, ${pct > 0 ? GREEN : RED} ${mix}%)`;
}

export function MarketMap() {
  const navigate = useNavigate();
  const prices = useLivePrices();
  const [stocks, setStocks] = useState<MapStock[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchMarketMap()
      .then(setStocks)
      .catch(() => setError(true));
  }, []);

  function changeOf(symbol: string): number | null {
    const p = prices[symbol];
    if (!p || !p.previousClose) return null;
    return ((p.price - p.previousClose) / p.previousClose) * 100;
  }

  const groups = useMemo(() => {
    const map = new Map<string, MapStock[]>();
    for (const s of stocks) {
      const list = map.get(s.sector) ?? [];
      list.push(s);
      map.set(s.sector, list);
    }
    return [...map.entries()];
  }, [stocks]);

  if (error) return <p className="tl-error">Could not load the market map. Refresh the page to try again.</p>;
  if (stocks.length === 0) return <p className="tl-empty">Loading the market map...</p>;

  return (
    <div>
      {groups.map(([sector, members]) => {
        const moves = members.map((m) => changeOf(m.symbol)).filter((v): v is number => v !== null);
        const avg = moves.length ? moves.reduce((a, b) => a + b, 0) / moves.length : null;
        return (
          <section key={sector} className="map-sector">
            <div className="map-sector-head">
              <span>{sector}</span>
              {avg !== null && (
                <span className={`pill ${avg >= 0 ? "up" : "down"}`}>
                  {avg >= 0 ? "▲ +" : "▼ −"}
                  {Math.abs(avg).toFixed(2)}%
                </span>
              )}
            </div>
            <div className="map-tiles">
              {members.map((m) => {
                const pct = changeOf(m.symbol);
                const p = prices[m.symbol];
                return (
                  <button
                    key={m.symbol}
                    className="map-tile"
                    style={{ backgroundColor: tileColor(pct) }}
                    onClick={() => navigate(`/trade/${m.symbol}`)}
                    title={`${m.name}${p ? `: ${inr(p.price)}` : ""}`}
                  >
                    <b>{m.symbol}</b>
                    <span className="pct">
                      {pct === null ? "—" : `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(2)}%`}
                    </span>
                    <small>{p ? inr(p.price) : ""}</small>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="map-legend">
        <span>−3%</span>
        <i />
        <span>+3%</span>
        <span className="map-legend-note">Color shows the change since the previous close.</span>
      </div>
      <p className="tl-note">
        All tiles are the same size. A true heat map sizes each tile by company value, which free price data does not include.
      </p>
    </div>
  );
}
