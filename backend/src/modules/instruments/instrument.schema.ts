import { z } from "zod";

export const instrumentResponseSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
});

export const getInstrumentsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(instrumentResponseSchema),
});