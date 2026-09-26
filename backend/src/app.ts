import Fastify from "fastify";
import { errorHandler } from "./plugins/error-handler.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(errorHandler);
  app.register(healthRoutes);

  return app;
}