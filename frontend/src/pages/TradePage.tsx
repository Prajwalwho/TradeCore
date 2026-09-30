import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { OrderForm } from "../components/OrderForm";
import { PriceChart } from "../components/PriceChart";
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
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        {livePrice ? `Live price: ${livePrice.price.toFixed(2)}` : "Loading price..."}
      </p>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 500px", minWidth: "320px" }}>
          <PriceChart symbol={symbol} livePrice={livePrice} />
        </div>
        <OrderForm symbol={symbol} currentPrice={livePrice?.price ?? null} />
      </div>
    </Layout>
  );
}