import { apiFetch } from "./api-client";

export type Side = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "PENDING" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED";

export type Order = {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  price: string | null;
  status: OrderStatus;
  createdAt: string;
};

export type PlaceOrderInput = {
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  price?: number;
};

export function placeOrder(input: PlaceOrderInput): Promise<Order> {
  return apiFetch<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchOrders(): Promise<Order[]> {
  return apiFetch<Order[]>("/orders");
}

export function cancelOrder(orderId: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`, { method: "DELETE" });
}