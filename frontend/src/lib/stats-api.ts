import { apiFetch } from "./api-client";

export type StockStats = {
  symbol: string;
  last: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  bidQty: number;
  askQty: number;
  bestBid: number | null;
  bestAsk: number | null;
};

export function fetchStats(symbol: string): Promise<StockStats> {
  return apiFetch<StockStats>(`/market-data/${symbol}/stats`);
}