import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { placeOrderSchema } from "../orders/order.schema.js";
import { amoService } from "./amo.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const amoRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/amo-orders",
    { preHandler: requireAuth, schema: { body: placeOrderSchema } },
    async (request) => {
      const { userId } = request.user as { userId: string };
      return successResponse(await amoService.place(userId, request.body));
    }
  );

  app.get("/amo-orders", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user as { userId: string };
    return successResponse(await amoService.list(userId));
  });

  app.delete("/amo-orders/:id", { preHandler: requireAuth }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { id } = request.params as { id: string };
    return successResponse(await amoService.cancel(userId, id));
  });
};