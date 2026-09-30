import { apiFetch, setTokens } from "./api-client";

type User = { id: string; email: string; createdAt: string };

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export async function login(email: string, password: string): Promise<User> {
  const data = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user;
}

export async function register(email: string, password: string): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}