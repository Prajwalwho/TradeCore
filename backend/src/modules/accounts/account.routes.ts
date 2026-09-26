import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { getAccountResponseSchema } from "./account.schema.js";
import { accountService } from "./account.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const accountRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/account",
    {
      preHandler: requireAuth,
      schema: {
        response: {
          200: getAccountResponseSchema,
        },
      },
    },
    async (request) => {
      const payload = request.user as { userId: string };
      const account = await accountService.getAccountForUser(payload.userId);

      return successResponse({
        id: account.id,
        userId: account.userId,
        balance: account.balance,
        createdAt: account.createdAt.toISOString(),
      });
    }
  );
};