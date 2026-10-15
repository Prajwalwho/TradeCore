import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { OrderForm } from "../components/OrderForm";
import { PriceChart } from "../components/PriceChart";
import { OrdersPanel } from "../components/OrdersPanel";
import { StockStats } from "../components/StockStats";
import { CurrencyNote } from "../components/CurrencyNote";
import { PriceCell } from "../components/PriceCell";
import { useLivePrices } from "../hooks/useLivePrices";
import { avatarColor, initials } from "../lib/avatar";

export function TradePage() {
  const { symbol } = useParams<{ symbol: string }>();
  const prices = useLivePrices();

  if (!symbol) {
    return null;
  }

  const livePrice = prices[symbol] ?? null;
  const prev = livePrice?.previousClose ?? null;
  const change = livePrice && prev ? livePrice.price - prev : null;
  const pct = change !== null && prev ? (change / prev) * 100 : null;
  const mood = change === null ? "" : change >= 0 ? " bull" : " bear";

  return (
    <Layout>
      <div className={`trade-head${mood}`}>
        <span className="avatar" style={{ background: avatarColor(symbol) }}>
          {initials(symbol)}
        </span>
        <h1>{symbol}</h1>
        <div className="trade-price">
          <PriceCell prefix="₹" value={livePrice?.price} />
        </div>
        {change !== null && pct !== null && (
          <span className={`pill ${change >= 0 ? "up" : "down"}`}>
            {change >= 0 ? "▲ +" : "▼ −"}
            {Math.abs(change).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
          </span>
        )}
      </div>
      <CurrencyNote symbol={symbol} price={livePrice?.price ?? null} />
      <div className="trade-grid">
        <div className="chart-wrap">
          <PriceChart symbol={symbol} livePrice={livePrice} />
        </div>
        <OrderForm symbol={symbol} currentPrice={livePrice?.price ?? null} />
      </div>
      <StockStats symbol={symbol} />
      <OrdersPanel symbol={symbol} />
    </Layout>
  );
}
