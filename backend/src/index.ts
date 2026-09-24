
import "dotenv/config";
import http from "node:http";
import { config } from "./config/env.js";

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });

  res.end(
    JSON.stringify({
      status: "ok",
      service: "paper-trading-backend",
    }),
  );
});

server.listen(config.port, () => {
  console.log(`Backend running on port ${config.port}`);
});
