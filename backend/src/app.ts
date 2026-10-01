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
import { accountRoutes } from "./modules/accounts/account.routes.js";
import { instrumentRoutes } from "./modules/instruments/instrument.routes.js";
import { marketDataRoutes } from "./modules/market-data/market-data.routes.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import { positionRoutes } from "./modules/positions/position.routes.js";
import { portfolioRoutes } from "./modules/portfolio/portfolio.routes.js";
import cors from "@fastify/cors";

export function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(accountRoutes);
  app.register(instrumentRoutes);
  app.register(marketDataRoutes);
  app.register(orderRoutes);
  app.register(positionRoutes);
  app.register(portfolioRoutes);
  
  return app;
}