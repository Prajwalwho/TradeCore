import { apiFetch } from "./api-client";

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
};

export type PricePoint = {
  symbol: string;
  price: number;
  updatedAt: string;
};

export async function fetchInstruments(): Promise<Instrument[]> {
  return apiFetch<Instrument[]>("/instruments");
}

export async function fetchMarketData(): Promise<PricePoint[]> {
  return apiFetch<PricePoint[]>("/market-data");
}