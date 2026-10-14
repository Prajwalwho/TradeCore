import { z } from "zod";

// bcrypt only uses the first 72 bytes of a password, so longer ones are refused instead of silently cut.
export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  emailVerified: z.boolean(),
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
    accessToken: z.string(),
    refreshToken: z.string(),
    user: userResponseSchema,
  }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const refreshResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
  }),
});

export const verifyEmailSchema = z.object({ token: z.string().min(10) });

export const forgotPasswordSchema = z.object({ email: z.string().email() });

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});