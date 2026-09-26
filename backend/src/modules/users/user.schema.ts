import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});

export const registerResponseSchema = z.object({
  success: z.literal(true),
  data: userResponseSchema,
});