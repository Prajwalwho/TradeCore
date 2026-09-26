import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { getPricesResponseSchema, getPriceResponseSchema } from "./market-data.schema.js";
import { marketDataService } from "./market-data.service.js";
import { successResponse } from "../../utils/response.js";
import { AppError } from "../../utils/app-error.js";

export const marketDataRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/market-data",
    { schema: { response: { 200: getPricesResponseSchema } } },
    async () => {
      return successResponse(marketDataService.getAllPrices());
    }
  );

  app.get(
    "/market-data/:symbol",
    { schema: { response: { 200: getPriceResponseSchema } } },
    async (request) => {
      const { symbol } = request.params as { symbol: string };
      const price = marketDataService.getPrice(symbol.toUpperCase());

      if (!price) {
        throw new AppError("Instrument not found", 404);
      }

      return price ? successResponse(price) : undefined;
    }
  );
};