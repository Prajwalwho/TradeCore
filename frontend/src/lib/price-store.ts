import { getAccessToken } from "./api-client";
import type { PricePoint } from "./market-api";

const WS_BASE = "ws://localhost:3000/ws";

// One shared WebSocket for the whole app. It opens when the first component needs prices,
// closes when the last one leaves, and reconnects by itself if the connection drops.
let socket: WebSocket | null = null;
let prices: Record<string, PricePoint> = {};
const listeners = new Set<() => void>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = 1000;

function emit() {
  listeners.forEach((listener) => listener());
}

function connect() {
  const token = getAccessToken();
  if (!token || socket) return;

  const ws = new WebSocket(`${WS_BASE}?token=${token}`);
  socket = ws;

  ws.onopen = () => {
    retryDelay = 1000;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string);
      if (msg.type === "snapshot" || msg.type === "price_update") {
        const next = { ...prices };
        for (const p of msg.prices as PricePoint[]) next[p.symbol] = p;
        prices = next;
        emit();
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    if (listeners.size > 0) {
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 15000);
    }
  };

  ws.onerror = () => ws.close();
}

export function subscribePrices(listener: () => void) {
  listeners.add(listener);
  if (!socket) connect();

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
      socket = null;
    }
  };
}

export function getPricesSnapshot() {
  return prices;
}
