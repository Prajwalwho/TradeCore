import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  placeOrderSchema,
  placeOrderResponseSchema,
  listOrdersResponseSchema,
} from "./order.schema.js";
import { orderService } from "./order.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";

export const orderRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/orders",
    {
      preHandler: requireAuth,
      schema: {
        body: placeOrderSchema,
        response: { 200: placeOrderResponseSchema },
      },
    },
    async (request) => {
      const { userId } = request.user as { userId: string };
      const order = await orderService.placeOrder(userId, request.body);
      return successResponse(order);
    }
  );

  app.get(
    "/orders",
    {
      preHandler: requireAuth,
      schema: {
        response: { 200: listOrdersResponseSchema },
      },
    },
    async (request) => {
      const { userId } = request.user as { userId: string };
      const orders = await orderService.listOrders(userId);
      return successResponse(orders);
    }
  );
};