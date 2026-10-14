import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { OrderForm } from "../components/OrderForm";
import { PriceChart } from "../components/PriceChart";
import { OrdersPanel } from "../components/OrdersPanel";
import { StockStats } from "../components/StockStats";
import { CurrencyNote } from "../components/CurrencyNote";
import { useLivePrices } from "../hooks/useLivePrices";

export function TradePage() {
  const { symbol } = useParams<{ symbol: string }>();
  const prices = useLivePrices();

  if (!symbol) {
    return null;
  }

  const livePrice = prices[symbol] ?? null;

  return (
    <Layout>
      <h1>{symbol}</h1>
      <p style={{ color: "#94a3b8", marginBottom: "0.75rem" }}>
        {livePrice ? `Live price: ₹${livePrice.price.toFixed(2)}` : "Loading price..."}
      </p>
      <CurrencyNote symbol={symbol} price={livePrice?.price ?? null} />
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 500px", minWidth: "320px" }}>
          <PriceChart symbol={symbol} livePrice={livePrice} />
        </div>
        <OrderForm symbol={symbol} currentPrice={livePrice?.price ?? null} />
      </div>
      <StockStats symbol={symbol} />
      <OrdersPanel symbol={symbol} />
    </Layout>
  );
}