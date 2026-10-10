import { apiFetch } from "./api-client";

export type Instrument = {
  id: string;
  symbol: string;
  name: string;
};

export type PricePoint = {
  symbol: string;
  price: number;
  previousClose: number | null;
  updatedAt: string;
};

export async function fetchInstruments(): Promise<Instrument[]> {
  return apiFetch<Instrument[]>("/instruments");
}

export async function fetchMarketData(): Promise<PricePoint[]> {
  return apiFetch<PricePoint[]>("/market-data");
}

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function fetchCandles(symbol: string): Promise<Candle[]> {
  return apiFetch<Candle[]>(`/market-data/${symbol}/candles`);
}