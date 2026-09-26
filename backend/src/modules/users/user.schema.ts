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

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

export const loginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    token: z.string(),
    user: userResponseSchema,
  }),
});