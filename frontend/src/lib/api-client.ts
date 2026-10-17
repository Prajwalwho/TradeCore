import { API_BASE } from "./config";

type TokenPair = { accessToken: string; refreshToken: string };

let accessToken: string | null = localStorage.getItem("accessToken");
let refreshToken: string | null = localStorage.getItem("refreshToken");

export function getAccessToken() {
  return accessToken;
}

export function isAuthenticated() {
  return accessToken !== null;
}

export function setTokens(tokens: TokenPair) {
  accessToken = tokens.accessToken;
  refreshToken = tokens.refreshToken;
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("me-cache");
}

// Tells the rest of the app that the login no longer works, so it can go back to the login page.
function signalExpired() {
  window.dispatchEvent(new Event("auth:expired"));
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) {
    signalExpired();
    return false;
  }

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    signalExpired();
    return false;
  }

  const body = await res.json();
  accessToken = body.data.accessToken;
  localStorage.setItem("accessToken", accessToken as string);
  return true;
}

// Every backend response is either {success:true, data:...} or an error body
// {success:false, error:{message}}. This is the one place that unwraps that shape,
// so every page just gets back plain data or a thrown ApiError.
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && allowRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, false); // retry exactly once
    }
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.error?.message ?? body?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return body.data as T;
}
