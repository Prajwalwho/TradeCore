import { useEffect, useState } from "react";
import { fetchFx, type FxInfo } from "../lib/fx-api";

type Props = { symbol: string; price: number | null };

export function CurrencyNote({ symbol, price }: Props) {
  const [fx, setFx] = useState<FxInfo | null>(null);

  useEffect(() => {
    const load = () => fetchFx().then(setFx).catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!fx || fx.usdInr === null || !fx.usdSymbols.includes(symbol)) return null;

  return (
    <p className="currency-note">
      {symbol} trades in US dollars. Prices here are converted to rupees at 1 USD = ₹{fx.usdInr.toFixed(2)}
      {price !== null ? ` (about $${(price / fx.usdInr).toFixed(2)} per share)` : ""}.
    </p>
  );
}
