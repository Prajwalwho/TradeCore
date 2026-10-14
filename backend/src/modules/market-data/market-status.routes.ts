import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { allMarketStatuses } from "../../config/exchanges.js";
import { marketDataService } from "./market-data.service.js";
import { successResponse } from "../../utils/response.js";

export const marketStatusRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/market-status", async () => successResponse(allMarketStatuses()));
  app.get("/indices", async () => successResponse(marketDataService.getIndices()));
};