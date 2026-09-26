import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  registerUserSchema,
  registerResponseSchema,
  loginUserSchema,
  loginResponseSchema,
} from "./user.schema.js";
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

  app.post(
    "/auth/login",
    {
      schema: {
        body: loginUserSchema,
        response: {
          200: loginResponseSchema,
        },
      },
    },
    async (request) => {
      const user = await userService.loginUser(request.body);

      const token = app.jwt.sign({ userId: user.id }, { expiresIn: "1h" });

      return successResponse({
        token,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      });
    }
  );
};