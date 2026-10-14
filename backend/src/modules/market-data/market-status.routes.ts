import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { allMarketStatuses } from "../../config/exchanges.js";
import { USD_SYMBOLS } from "../../config/currency.js";
import { marketDataService } from "./market-data.service.js";
import { fxService } from "./fx.service.js";
import { successResponse } from "../../utils/response.js";

export const marketStatusRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/market-status", async () => successResponse(allMarketStatuses()));
  app.get("/indices", async () => successResponse(marketDataService.getIndices()));
  app.get("/fx", async () => {
    const { usdInr, updatedAt } = fxService.getUsdInr() === null
      ? { usdInr: null, updatedAt: null }
      : fxService.getInfo();
    return successResponse({ usdInr, updatedAt, usdSymbols: USD_SYMBOLS });
  });
};
