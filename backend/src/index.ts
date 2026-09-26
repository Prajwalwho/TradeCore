import { buildApp } from "./app.js";
import { config } from "./config/env.js";
import { marketDataService } from "./modules/market-data/market-data.service.js";

const app = buildApp();

const start = async () => {
  try {
    await marketDataService.initialize();
    marketDataService.startGenerating();

    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();