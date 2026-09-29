import { z } from "zod";

export const portfolioPositionSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  avgCost: z.string(),
  currentPrice: z.string().nullable(),
  marketValue: z.string().nullable(),
  unrealizedPnl: z.string().nullable(),
  realizedPnl: z.string(),
  totalPnl: z.string().nullable(),
});

export const portfolioResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    cash: z.string(),
    positions: z.array(portfolioPositionSchema),
    holdingsValue: z.string(),
    totalValue: z.string(),
  }),
});