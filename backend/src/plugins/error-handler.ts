import type { FastifyError, FastifyInstance } from "fastify";
import { errorResponse } from "../utils/response.js";

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send(
      errorResponse(error.message ?? "Something went wrong", statusCode)
    );
  });
}