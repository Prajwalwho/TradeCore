import { apiFetch } from "./api-client";

export type MarketStatus = { code: string; name: string; open: boolean };

export function fetchMarketStatus(): Promise<MarketStatus[]> {
  return apiFetch<MarketStatus[]>("/market-status");
}