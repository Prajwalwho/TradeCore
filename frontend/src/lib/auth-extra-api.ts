import { apiFetch } from "./api-client";

export type Me = { userId: string; email: string; emailVerified: boolean };
type Message = { message: string };

export function fetchMe(): Promise<Me> {
  return apiFetch<Me>("/auth/me");
}

export function verifyEmail(token: string): Promise<Message> {
  return apiFetch<Message>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(): Promise<Message> {
  return apiFetch<Message>("/auth/resend-verification", { method: "POST" });
}

export function forgotPassword(email: string): Promise<Message> {
  return apiFetch<Message>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string): Promise<Message> {
  return apiFetch<Message>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}