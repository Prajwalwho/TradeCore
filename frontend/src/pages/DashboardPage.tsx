import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { InstrumentList } from "../components/InstrumentList";
import { fetchInstruments, type Instrument } from "../lib/market-api";
import { useLivePrices } from "../hooks/useLivePrices";

export function DashboardPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prices = useLivePrices();

  useEffect(() => {
    fetchInstruments()
      .then(setInstruments)
      .catch(() => setError("Could not load instruments"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1>Markets</h1>
      {loading && <p>Loading instruments...</p>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {!loading && !error && <InstrumentList instruments={instruments} prices={prices} />}
    </Layout>
  );
}