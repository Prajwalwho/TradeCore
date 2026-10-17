import "dotenv/config";

const list = (value: string | undefined, fallback: string[]) =>
  value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : fallback;

export const config = {
  port: Number(process.env.PORT ?? 3000),

  jwtSecret: process.env.JWT_SECRET ?? "",

  // Where the website lives. Used to build the links inside emails.
  appUrl: process.env.APP_URL ?? "http://localhost:5173",

  // Websites allowed to call this API, separated by commas.
  corsOrigins: list(process.env.CORS_ORIGINS, [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
  ]),

  // Set TRUST_PROXY=true when the backend sits behind a reverse proxy (so rate limits see the real visitor address).
  trustProxy: process.env.TRUST_PROXY === "true",

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

  marketMaker: {
    enabled: process.env.MARKET_MAKER_ENABLED === "true",
  },

  marketHours: {
    enforce: process.env.ENFORCE_MARKET_HOURS === "true",
  },

  // Set REQUIRE_EMAIL_VERIFICATION=false for local demos: new accounts can trade straight away.
  emailVerification: {
    required: process.env.REQUIRE_EMAIL_VERIFICATION !== "false",
  },
};

if (!config.jwtSecret) {
  throw new Error("JWT_SECRET is not set in environment variables");
}
