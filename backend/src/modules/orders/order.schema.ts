import { z } from "zod";

export const placeOrderSchema = z
  .object({
    symbol: z.string().min(1),
    side: z.enum(["BUY", "SELL"]),
    type: z.enum(["MARKET", "LIMIT"]),
    quantity: z.number().int().positive(),
    price: z.number().positive().optional(),
  })
  .refine((o) => o.type !== "LIMIT" || o.price !== undefined, {
    message: "price is required for LIMIT orders",
    path: ["price"],
  })
  .refine((o) => o.type !== "MARKET" || o.price === undefined, {
    message: "MARKET orders must not include a price",
    path: ["price"],
  });

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT"]),
  quantity: z.number(),
  filledQuantity: z.number(),
  price: z.string().nullable(),
  status: z.enum(["PENDING", "PARTIALLY_FILLED", "FILLED", "CANCELLED", "REJECTED"]),
  createdAt: z.string(),
});

export const placeOrderResponseSchema = z.object({
  success: z.literal(true),
  data: orderResponseSchema,
});

export const listOrdersResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(orderResponseSchema),
});