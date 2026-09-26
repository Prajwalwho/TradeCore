import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { successResponse } from "../utils/response.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get(
    "/health",
    {
      schema: {
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              status: z.string(),
              service: z.string(),
            }),
          }),
        },
      },
    },
    async () => {
      return successResponse({
        status: "ok",
        service: "paper-trading-backend",
      });
    }
  );
}