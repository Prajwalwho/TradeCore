import { apiFetch } from "./api-client";

export type PortfolioPosition = {
  symbol: string;
  quantity: number;
  avgCost: string;
  currentPrice: string | null;
  marketValue: string | null;
  unrealizedPnl: string | null;
  realizedPnl: string;
  totalPnl: string | null;
};

export type Portfolio = {
  cash: string;
  positions: PortfolioPosition[];
  holdingsValue: string;
  totalValue: string;
};

export function fetchPortfolio(): Promise<Portfolio> {
  return apiFetch<Portfolio>("/portfolio");
}