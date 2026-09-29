import { buildApp } from "./app.js";
import { config } from "./config/env.js";
import { engineClient } from "./modules/engine/engine.client.js";
import { marketDataService } from "./modules/market-data/market-data.service.js";
import { attachWebSocketServer } from "./websocket/ws.server.js";

const app = buildApp();

const start = async () => {
  try {
    await engineClient.start();
    app.log.info("matching engine ready");

    await marketDataService.initialize();
    marketDataService.startGenerating();

    await app.ready(); // ensures app.server exists and all plugins (jwt) are loaded
    attachWebSocketServer(app, app.server);

    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    await engineClient.stop();
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await engineClient.stop();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

start();