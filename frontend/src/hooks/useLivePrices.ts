import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../lib/api-client";
import type { PricePoint } from "../lib/market-api";

const WS_BASE = "ws://localhost:3000/ws";

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, PricePoint>>({});
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      return;
    }

    const socket = new WebSocket(`${WS_BASE}?token=${token}`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "snapshot" || msg.type === "price_update") {
        setPrices((prev) => {
          const next = { ...prev };
          for (const p of msg.prices as PricePoint[]) {
            next[p.symbol] = p;
          }
          return next;
        });
      }
      // order_update / trade messages (Day 23) are handled by other hooks later,
      // ignored here on purpose — this hook only cares about prices.
    };

    socket.onerror = (err) => console.error("[ws] error", err);

    return () => {
      socket.close();
    };
  }, []);

  return prices;
}