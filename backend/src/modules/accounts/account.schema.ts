import { z } from "zod";

export const accountResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  balance: z.string(),
  createdAt: z.string(),
});

export const getAccountResponseSchema = z.object({
  success: z.literal(true),
  data: accountResponseSchema,
});