import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { listPositionsResponseSchema } from "./position.schema.js";
import { positionRepository } from "./position.repository.js";
import { accountRepository } from "../accounts/account.repository.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal } from "../../utils/money.js";

export const positionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/positions",
    {
      preHandler: requireAuth,
      schema: { response: { 200: listPositionsResponseSchema } },
    },
    async (request) => {
      const { userId } = request.user as { userId: string };
      const account = await accountRepository.findByUserId(userId);
      if (!account) {
        throw new AppError("Account not found", 404);
      }

      const rows = await positionRepository.findByAccountId(account.id);
      return successResponse(
        rows
          .filter(({ position }) => position.quantity > 0)
          .map(({ position, symbol }) => ({
            symbol,
            quantity: position.quantity,
            avgCost: centsToDecimal(position.avgCostCents),
            realizedPnl: centsToDecimal(position.realizedPnlCents),
          }))
      );
    }
  );
};