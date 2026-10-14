import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { allMarketStatuses } from "../../config/exchanges.js";
import { successResponse } from "../../utils/response.js";

export const marketStatusRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/market-status", async () => successResponse(allMarketStatuses()));
};