import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { getInstrumentsResponseSchema } from "./instrument.schema.js";
import { instrumentService } from "./instrument.service.js";
import { successResponse } from "../../utils/response.js";

export const instrumentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/instruments",
    {
      schema: {
        response: {
          200: getInstrumentsResponseSchema,
        },
      },
    },
    async () => {
      const instruments = await instrumentService.listInstruments();
      return successResponse(instruments);
    }
  );
};