import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { marketDataService } from "../modules/market-data/market-data.service.js";
import { redisSubscriber } from "../redis/redis.client.js";
import { MARKET_DATA_CHANNEL } from "../modules/market-data/market-data.service.js";

type AuthedSocket = WebSocket & { userId?: string };

export function attachWebSocketServer(app: FastifyInstance, server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<AuthedSocket>();

  wss.on("connection", (socket: AuthedSocket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      socket.close(4001, "missing token");
      return;
    }

    try {
      const payload = app.jwt.verify<{ userId: string; type: string }>(token);
      if (payload.type !== "access") {
        socket.close(4001, "invalid token type");
        return;
      }
      socket.userId = payload.userId;
    } catch {
      socket.close(4001, "invalid or expired token");
      return;
    }

    clients.add(socket);
    app.log.info({ userId: socket.userId }, "ws client connected");

    // Still read straight from the local in-memory map: a fresh connection just
    // needs *some* current values immediately, and this process already has them.
    socket.send(JSON.stringify({ type: "snapshot", prices: marketDataService.getAllPrices() }));

    socket.on("close", () => {
      clients.delete(socket);
      app.log.info({ userId: socket.userId }, "ws client disconnected");
    });

    socket.on("error", (err) => {
      app.log.error({ err }, "ws client error");
    });
  });

        redisSubscriber
    .subscribe(MARKET_DATA_CHANNEL)
    .then(() => app.log.info(`subscribed to ${MARKET_DATA_CHANNEL}`))
    .catch((err: Error) => app.log.error({ err }, "failed to subscribe to market data channel"));

  redisSubscriber.on("message", (channel: string, message: string) => {
    if (channel !== MARKET_DATA_CHANNEL) {
      return;
    }
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  return wss;
}