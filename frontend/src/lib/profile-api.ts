import { apiFetch } from "./api-client";

export type Profile = {
  email: string;
  totalFunds: string;
  availableFunds: string;
  usedMargin: string;
  holdingsValue: string;
  totalValue: string;
  unrealizedPnl: string;
  netProfit: string;
  netLoss: string;
  netPnl: string;
  totalPnl: string;
  positiveCount: number;
  negativeCount: number;
  bySymbol: { symbol: string; pnl: string; trades: number }[];
  recent: {
    symbol: string;
    quantity: number;
    avgCost: string;
    sellPrice: string;
    pnl: string;
    time: string;
  }[];
};

export function fetchProfile(): Promise<Profile> {
  return apiFetch<Profile>("/profile");
}
