import Fastify from "fastify";
import { config } from "./config/env.js";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
    service: "paper-trading-backend",
  };
});

const start = async () => {
  try {
    await app.listen({
      port: config.port,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();