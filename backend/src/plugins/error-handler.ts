import type { FastifyError, FastifyInstance } from "fastify";
import { errorResponse } from "../utils/response.js";

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;

    // Never show internal error text (database messages and so on) to the outside world.
    const message =
      statusCode >= 500 ? "Something went wrong" : (error.message ?? "Something went wrong");

    reply.status(statusCode).send(errorResponse(message, statusCode));
  });
}