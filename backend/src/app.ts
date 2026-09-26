import { userRoutes } from "./modules/users/user.routes.js";
import Fastify from "fastify";
import { jwtPlugin } from "./plugins/jwt.js";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { errorHandler } from "./plugins/error-handler.js";
import { healthRoutes } from "./routes/health.js";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(healthRoutes);
  app.register(userRoutes);

  return app;
}