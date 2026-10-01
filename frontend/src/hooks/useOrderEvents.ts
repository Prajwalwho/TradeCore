import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../lib/api-client";

type OrderUpdateEvent = {
  type: "order_update";
  orderId: string;
  status: string;
  filledQuantity: number;
  symbol: string;
};

type TradeEvent = {
  type: "trade";
  tradeId: string;
  symbol: string;
  side: "BUY" | "SELL";
  price: string;
  quantity: number;
  orderId: string;
};

const WS_BASE = "ws://localhost:3000/ws";

// A counter, not the event itself: consumers just need to know "something
// changed, go refetch" rather than trying to patch their own state from a
// partial event. Simpler, and avoids the list and the event ever disagreeing.
export function useOrderEvents() {
  const [version, setVersion] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socket = new WebSocket(`${WS_BASE}?token=${token}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as { type: string } & Partial<OrderUpdateEvent & TradeEvent>;
      if (msg.type === "order_update" || msg.type === "trade") {
        setVersion((v) => v + 1);
      }
    };

    return () => socket.close();
  }, []);

  return version;
}