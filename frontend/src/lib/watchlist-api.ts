import { apiFetch } from "./api-client";

export type WatchlistItem = { symbol: string; name: string };
export type InstrumentItem = { id: string; symbol: string; name: string };
export type IndexPoint = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  updatedAt: string;
};

export function fetchWatchlist(): Promise<WatchlistItem[]> {
  return apiFetch<WatchlistItem[]>("/watchlist");
}

export function addToWatchlist(symbol: string): Promise<WatchlistItem[]> {
  return apiFetch<WatchlistItem[]>("/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export function removeFromWatchlist(symbol: string): Promise<WatchlistItem[]> {
  return apiFetch<WatchlistItem[]>(`/watchlist/${symbol}`, { method: "DELETE" });
}

export function fetchInstruments(): Promise<InstrumentItem[]> {
  return apiFetch<InstrumentItem[]>("/instruments");
}

export function fetchIndices(): Promise<IndexPoint[]> {
  return apiFetch<IndexPoint[]>("/indices");
}