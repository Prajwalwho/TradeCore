import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { profileService } from "./profile.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const profileRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/profile", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user as { userId: string };
    return successResponse(await profileService.getProfile(userId));
  });
};