import { apiFetch } from "./api-client";
import type { PlaceOrderInput } from "./orders-api";

export type AmoOrder = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  price: string | null;
  status: string;
  note: string | null;
  createdAt: string;
};

export function placeAmo(input: PlaceOrderInput): Promise<AmoOrder> {
  return apiFetch<AmoOrder>("/amo-orders", { method: "POST", body: JSON.stringify(input) });
}

export function fetchAmo(): Promise<AmoOrder[]> {
  return apiFetch<AmoOrder[]>("/amo-orders");
}

export function cancelAmo(id: string): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(`/amo-orders/${id}`, { method: "DELETE" });
}