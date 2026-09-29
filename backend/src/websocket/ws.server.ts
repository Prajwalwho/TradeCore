import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "node:http";
import type { FastifyInstance } from "fastify";
import { marketDataService } from "../modules/market-data/market-data.service.js";
import { redisSubscriber } from "../redis/redis.client.js";
import { MARKET_DATA_CHANNEL } from "../modules/market-data/market-data.service.js";
import { userEventChannel } from "./user-events.js";

type AuthedSocket = WebSocket & { userId?: string };

export function attachWebSocketServer(app: FastifyInstance, server: HttpServer) {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const marketDataClients = new Set<AuthedSocket>();

  // Multiple sockets per user (e.g. two open tabs), and only users who are
  // actually connected get an entry at all.
  const userClients = new Map<string, Set<AuthedSocket>>();

  function subscribeUserChannel(userId: string) {
    redisSubscriber
      .subscribe(userEventChannel(userId))
      .catch((err: Error) =>
        app.log.error({ err, userId }, "failed to subscribe to user event channel")
      );
  }

  function unsubscribeUserChannelIfEmpty(userId: string) {
    if (!userClients.get(userId)?.size) {
      userClients.delete(userId);
      redisSubscriber
        .unsubscribe(userEventChannel(userId))
        .catch((err: Error) =>
          app.log.error({ err, userId }, "failed to unsubscribe from user event channel")
        );
    }
  }

  wss.on("connection", (socket: AuthedSocket, request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      socket.close(4001, "missing token");
      return;
    }

    let userId: string;
    try {
      const payload = app.jwt.verify<{ userId: string; type: string }>(token);
      if (payload.type !== "access") {
        socket.close(4001, "invalid token type");
        return;
      }
      userId = payload.userId;
      socket.userId = userId;
    } catch {
      socket.close(4001, "invalid or expired token");
      return;
    }

    marketDataClients.add(socket);

    let sockets = userClients.get(userId);
    if (!sockets) {
      sockets = new Set();
      userClients.set(userId, sockets);
      subscribeUserChannel(userId); // first connection for this user on this process
    }
    sockets.add(socket);

    app.log.info({ userId }, "ws client connected");

    socket.send(JSON.stringify({ type: "snapshot", prices: marketDataService.getAllPrices() }));

    socket.on("close", () => {
      marketDataClients.delete(socket);
      userClients.get(userId)?.delete(socket);
      unsubscribeUserChannelIfEmpty(userId);
      app.log.info({ userId }, "ws client disconnected");
    });

    socket.on("error", (err) => {
      app.log.error({ err, userId }, "ws client error");
    });
  });

  redisSubscriber
    .subscribe(MARKET_DATA_CHANNEL)
    .then(() => app.log.info(`subscribed to ${MARKET_DATA_CHANNEL}`))
    .catch((err: Error) => app.log.error({ err }, "failed to subscribe to market data channel"));

  redisSubscriber.on("message", (channel: string, message: string) => {
    if (channel === MARKET_DATA_CHANNEL) {
      for (const client of marketDataClients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
      return;
    }

    if (channel.startsWith("user-events:")) {
      const userId = channel.slice("user-events:".length);
      const sockets = userClients.get(userId);
      if (!sockets) {
        return; // nobody from this user connected to this process right now
      }
      for (const client of sockets) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      }
    }
  });

  return wss;
}