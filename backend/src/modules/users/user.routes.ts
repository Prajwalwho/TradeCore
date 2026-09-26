import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  registerUserSchema,
  registerResponseSchema,
  loginUserSchema,
  loginResponseSchema,
  refreshTokenSchema,
  refreshResponseSchema,
} from "./user.schema.js";
import { userService } from "./user.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../utils/app-error.js";

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

      const accessToken = app.jwt.sign(
        { userId: user.id, type: "access" },
        { expiresIn: "1h" }
      );

      const refreshToken = app.jwt.sign(
        { userId: user.id, type: "refresh" },
        { expiresIn: "7d" }
      );

      return successResponse({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt.toISOString(),
        },
      });
    }
  );

  app.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (request) => {
      const payload = request.user as { userId: string };
      return successResponse({ userId: payload.userId });
    }
  );

  app.post(
    "/auth/refresh",
    {
      schema: {
        body: refreshTokenSchema,
        response: {
          200: refreshResponseSchema,
        },
      },
    },
    async (request) => {
      let payload: { userId: string; type: string };

      try {
        payload = app.jwt.verify(request.body.refreshToken);
      } catch {
        throw new AppError("Invalid or expired refresh token", 401);
      }

      if (payload.type !== "refresh") {
        throw new AppError("Invalid token type", 401);
      }

      const accessToken = app.jwt.sign(
        { userId: payload.userId, type: "access" },
        { expiresIn: "1h" }
      );

      return successResponse({ accessToken });
    }
  );
};