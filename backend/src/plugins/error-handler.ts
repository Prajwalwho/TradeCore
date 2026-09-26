import type { FastifyError, FastifyInstance } from "fastify";

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      error: error.name ?? "InternalServerError",
      message: error.message ?? "Something went wrong",
      statusCode,
    });
  });
}