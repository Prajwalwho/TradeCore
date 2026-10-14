import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { watchlistService } from "./watchlist.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const watchlistRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/watchlist", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user as { userId: string };
    return successResponse(await watchlistService.list(userId));
  });

  app.post(
    "/watchlist",
    { preHandler: requireAuth, schema: { body: z.object({ symbol: z.string().min(1) }) } },
    async (request) => {
      const { userId } = request.user as { userId: string };
      return successResponse(await watchlistService.add(userId, request.body.symbol));
    }
  );

  app.delete("/watchlist/:symbol", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { symbol } = request.params as { symbol: string };
    return successResponse(await watchlistService.remove(userId, symbol));
  });
};