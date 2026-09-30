import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { OrderForm } from "../components/OrderForm";
import { useLivePrices } from "../hooks/useLivePrices";

export function TradePage() {
  const { symbol } = useParams<{ symbol: string }>();
  const prices = useLivePrices();

  if (!symbol) {
    return null;
  }

  const currentPrice = prices[symbol]?.price ?? null;

  return (
    <Layout>
      <h1>{symbol}</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        {currentPrice ? `Live price: ${currentPrice.toFixed(2)}` : "Loading price..."}
      </p>
      <OrderForm symbol={symbol} currentPrice={currentPrice} />
    </Layout>
  );
}