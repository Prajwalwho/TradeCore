import { SYMBOL_EXCHANGE, exchangeFor } from "./exchanges.js";

export type Currency = "INR" | "USD";

export function currencyFor(symbol: string): Currency {
  return exchangeFor(symbol) === "US" ? "USD" : "INR";
}

export const USD_SYMBOLS = Object.keys(SYMBOL_EXCHANGE).filter((s) => SYMBOL_EXCHANGE[s] === "US");