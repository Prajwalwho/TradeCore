import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { registerUserSchema, registerResponseSchema } from "./user.schema.js";
import { userService } from "./user.service.js";
import { successResponse } from "../../utils/response.js";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/auth/register",
    {
      schema: {
        body: registerUserSchema,
        response: {
          200: registerResponseSchema,
        },
      },
    },
    async (request) => {
      const user = await userService.registerUser(request.body);
      return successResponse({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      });
    }
  );
};