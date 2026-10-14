import fp from "fastify-plugin";
import type { FastifyError } from "fastify";
import { errorResponse } from "../utils/response.js";

// Wrapped with fastify-plugin so this handler applies to every route, not only to itself.
export const errorHandler = fp(async (app) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;

    // Never show internal error text (database messages and so on) to the outside world.
    const message =
      statusCode >= 500 ? "Something went wrong" : (error.message ?? "Something went wrong");

    reply.status(statusCode).send(errorResponse(message, statusCode));
  });
});