import { useSyncExternalStore } from "react";
import { subscribePrices, getPricesSnapshot } from "../lib/price-store";

// Every component shares the same live connection.
export function useLivePrices() {
  return useSyncExternalStore(subscribePrices, getPricesSnapshot);
}
