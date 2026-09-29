import { Redis } from "ioredis";
import { config } from "../config/env.js";

function createConnection() {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
  });
}

// Separate connections: once a connection issues SUBSCRIBE, Redis puts it into
// subscriber mode and it can no longer run ordinary commands like PUBLISH.
export const redisPublisher = createConnection();
export const redisSubscriber = createConnection();

redisPublisher.on("error", (err: Error) => console.error("[redis publisher]", err.message));
redisSubscriber.on("error", (err: Error) => console.error("[redis subscriber]", err.message));