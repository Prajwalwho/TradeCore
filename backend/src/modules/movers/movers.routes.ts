import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { marketDataService } from "../market-data/market-data.service.js";
import { successResponse } from "../../utils/response.js";

export const moversRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/movers", async () => {
    const rows = marketDataService
      .getAllPrices()
      .filter((p) => marketDataService.hasRealPrice(p.symbol) && p.previousClose)
      .map((p) => {
        const prev = p.previousClose as number;
        const change = p.price - prev;
        return {
          symbol: p.symbol,
          price: p.price,
          change,
          changePct: (change / prev) * 100,
        };
      })
      .sort((a, b) => b.changePct - a.changePct);

    return successResponse({
      gainers: rows.filter((r) => r.changePct > 0).slice(0, 10),
      losers: rows.filter((r) => r.changePct < 0).reverse().slice(0, 10),
    });
  });
};