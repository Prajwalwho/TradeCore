import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { getPricesResponseSchema, getPriceResponseSchema } from "./market-data.schema.js";
import { marketDataService } from "./market-data.service.js";
import { successResponse } from "../../utils/response.js";
import { AppError } from "../../utils/app-error.js";

const candlesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      time: z.number(),
      open: z.number(),
      high: z.number(),
      low: z.number(),
      close: z.number(),
    })
  ),
});

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

      return successResponse(price);
    }
  );

  app.get(
    "/market-data/:symbol/candles",
    { schema: { response: { 200: candlesResponseSchema } } },
    async (request) => {
      const { symbol } = request.params as { symbol: string };
      const candles = await marketDataService.getCandles(symbol.toUpperCase());

      if (!candles) {
        throw new AppError("Candle data unavailable", 404);
      }

      return successResponse(candles);
    }
  );
};