import { userRoutes } from "./modules/users/user.routes.js";
import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config/env.js";
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
import { marketStatusRoutes } from "./modules/market-data/market-status.routes.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import { positionRoutes } from "./modules/positions/position.routes.js";
import { portfolioRoutes } from "./modules/portfolio/portfolio.routes.js";
import { amoRoutes } from "./modules/amo/amo.routes.js";
import { watchlistRoutes } from "./modules/watchlist/watchlist.routes.js";
import { profileRoutes } from "./modules/profile/profile.routes.js";
import { moversRoutes } from "./modules/movers/movers.routes.js";
import { newsRoutes } from "./modules/news/news.routes.js";
import { marketMapRoutes } from "./modules/market-map/market-map.routes.js";
import cors from "@fastify/cors";

export function buildApp() {
  const app = Fastify({ logger: true, trustProxy: config.trustProxy }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.register(errorHandler);
  app.register(jwtPlugin);
  // A general limit per IP address; the login, register and password routes set stricter ones.
  app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });
  app.register(healthRoutes);
  app.register(userRoutes);
  app.register(accountRoutes);
  app.register(instrumentRoutes);
  app.register(marketDataRoutes);
  app.register(marketStatusRoutes);
  app.register(orderRoutes);
  app.register(positionRoutes);
  app.register(portfolioRoutes);
  app.register(amoRoutes);
  app.register(watchlistRoutes);
  app.register(profileRoutes);
  app.register(moversRoutes);
  app.register(newsRoutes);
  app.register(marketMapRoutes);

  return app;
}
