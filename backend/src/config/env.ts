import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3000),

  jwtSecret: process.env.JWT_SECRET ?? "",

  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 5433),
    user: process.env.DB_USER ?? "trading",
    password: process.env.DB_PASSWORD ?? "trading_dev",
    name: process.env.DB_NAME ?? "paper_trading",
  },

  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6380),
  },

  engine: {
    // Relative to the directory the backend runs from (backend/)
    binaryPath: process.env.ENGINE_BINARY ?? "../engine/build/engine_server",
  },
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET is not set in environment variables");
}