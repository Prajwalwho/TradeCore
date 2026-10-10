import { useNavigate } from "react-router-dom";
import type { Instrument, PricePoint } from "../lib/market-api";
import "./InstrumentList.css";

type Props = {
  instruments: Instrument[];
  prices: Record<string, PricePoint>;
};

export function InstrumentList({ instruments, prices }: Props) {
  const navigate = useNavigate();

  return (
    <table className="instrument-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Name</th>
          <th className="num">Price</th>
          <th className="num">Change</th>
        </tr>
      </thead>
      <tbody>
        {instruments.map((inst) => {
          const live = prices[inst.symbol];
          const prev = live?.previousClose ?? null;
          const change = live && prev ? live.price - prev : null;
          const pct = change !== null && prev ? (change / prev) * 100 : null;
          const dir = change === null ? "" : change >= 0 ? "up" : "down";

          return (
            <tr key={inst.id} onClick={() => navigate(`/trade/${inst.symbol}`)}>
              <td className="symbol">{inst.symbol}</td>
              <td>{inst.name}</td>
              <td className="num price">{live ? live.price.toFixed(2) : "—"}</td>
              <td className={`num change ${dir}`}>
                {change !== null && pct !== null
                  ? `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(2)} (${Math.abs(pct).toFixed(2)}%)`
                  : "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}