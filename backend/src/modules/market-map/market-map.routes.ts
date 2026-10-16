import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { CATALOG } from "../../config/catalog.js";
import { successResponse } from "../../utils/response.js";

// Which sector each stock belongs to. Prices come separately, over the live WebSocket.
export const marketMapRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/market-map", async () =>
    successResponse(
      CATALOG.map(({ symbol, name, sector, exchange }) => ({ symbol, name, sector, exchange }))
    )
  );
};
