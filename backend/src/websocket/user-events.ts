import { redisPublisher } from "../redis/redis.client.js";

export function userEventChannel(userId: string): string {
  return `user-events:${userId}`;
}

export type OrderUpdateEvent = {
  type: "order_update";
  orderId: string;
  status: string;
  filledQuantity: number;
  symbol: string;
};

export type TradeEvent = {
  type: "trade";
  tradeId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: string;
  quantity: number;
  orderId: string;
};

export type UserEvent = OrderUpdateEvent | TradeEvent;

export function publishUserEvent(userId: string, event: UserEvent) {
  return redisPublisher.publish(userEventChannel(userId), JSON.stringify(event));
}