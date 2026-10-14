import { apiFetch } from "./api-client";

export type Mover = { symbol: string; price: number; change: number; changePct: number };
export type Movers = { gainers: Mover[]; losers: Mover[] };
export type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
};

export function fetchMovers(): Promise<Movers> {
  return apiFetch<Movers>("/movers");
}

export function fetchNews(symbol: string): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/news?symbol=${encodeURIComponent(symbol)}`);
}