import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { portfolioResponseSchema } from "./portfolio.schema.js";
import { portfolioService } from "./portfolio.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const portfolioRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/portfolio",
    {
      preHandler: requireAuth,
      schema: { response: { 200: portfolioResponseSchema } },
    },
    async (request) => {
      const { userId } = request.user as { userId: string };
      const portfolio = await portfolioService.getPortfolio(userId);
      return successResponse(portfolio);
    }
  );
};