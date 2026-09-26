import { z } from "zod";

export const priceSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  updatedAt: z.string(),
});

export const getPricesResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(priceSchema),
});

export const getPriceResponseSchema = z.object({
  success: z.literal(true),
  data: priceSchema,
});