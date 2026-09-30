import { apiFetch } from "./api-client";

export type Position = {
  symbol: string;
  quantity: number;
  avgCost: string;
  realizedPnl: string;
};

export function fetchPositions(): Promise<Position[]> {
  return apiFetch<Position[]>("/positions");
}