import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { newsService } from "./news.service.js";
import { successResponse } from "../../utils/response.js";

export const newsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/news", async (request) => {
    const { symbol } = request.query as { symbol?: string };
    return successResponse(await newsService.get((symbol ?? "ALL").toUpperCase()));
  });
};