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
          <th>Price</th>
        </tr>
      </thead>
      <tbody>
        {instruments.map((inst) => {
          const live = prices[inst.symbol];
          return (
            <tr key={inst.id} onClick={() => navigate(`/trade/${inst.symbol}`)}>
              <td className="symbol">{inst.symbol}</td>
              <td>{inst.name}</td>
              <td className="price">{live ? live.price.toFixed(2) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}