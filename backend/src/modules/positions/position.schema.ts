import { z } from "zod";

export const positionResponseSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  avgCost: z.string(),
  realizedPnl: z.string(),
});

export const listPositionsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(positionResponseSchema),
});