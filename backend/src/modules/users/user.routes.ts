import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  registerUserSchema,
  registerResponseSchema,
  loginUserSchema,
  loginResponseSchema,
  refreshTokenSchema,
  refreshResponseSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./user.schema.js";
import { userService } from "./user.service.js";
import { successResponse } from "../../utils/response.js";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../utils/app-error.js";

export const userRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/auth/register",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
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
        emailVerified: user.emailVerifiedAt !== null,
      });
    }
  );

  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
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
          emailVerified: user.emailVerifiedAt !== null,
        },
      });
    }
  );

  app.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (request) => {
      const payload = request.user as { userId: string };
      return successResponse(await userService.getMe(payload.userId));
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

  app.post(
    "/auth/verify-email",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
      schema: { body: verifyEmailSchema },
    },
    async (request) => {
      await userService.verifyEmail(request.body.token);
      return successResponse({ message: "Email verified" });
    }
  );

  app.post(
    "/auth/resend-verification",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    },
    async (request) => {
      const { userId } = request.user as { userId: string };
      return successResponse(await userService.resendVerification(userId));
    }
  );

  app.post(
    "/auth/forgot-password",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
      schema: { body: forgotPasswordSchema },
    },
    async (request) => {
      await userService.forgotPassword(request.body.email);
      return successResponse({
        message: "If that email is registered, a reset link has been sent.",
      });
    }
  );

  app.post(
    "/auth/reset-password",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
      schema: { body: resetPasswordSchema },
    },
    async (request) => {
      await userService.resetPassword(request.body.token, request.body.password);
      return successResponse({ message: "Password updated. You can log in now." });
    }
  );
};