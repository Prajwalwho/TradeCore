import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
});