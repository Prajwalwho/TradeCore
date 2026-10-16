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

type IncomingMessage = OrderUpdateEvent | TradeEvent | { type: string };

import { WS_URL } from "../lib/config";

export function useOrderEvents() {
  const [version, setVersion] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socket = new WebSocket(`${WS_URL}?token=${token}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as IncomingMessage;
      if (msg.type === "order_update" || msg.type === "trade") {
        setVersion((v) => v + 1);
      }
    };

    return () => socket.close();
  }, []);

  return version;
}