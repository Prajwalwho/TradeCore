import { useParams } from "react-router-dom";
import { Layout } from "../components/Layout";

export function TradePage() {
  const { symbol } = useParams();
  return (
    <Layout>
      <h1>{symbol} (order form built on Day 26)</h1>
    </Layout>
  );
}