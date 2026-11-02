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

// Free hosting puts the server to sleep when nobody is using it, and waking it takes up to a minute.
// For read requests on a hosted server, keep trying for about a minute and show the "waking up" banner.
// Writes (orders and so on) are never repeated, so nothing can be submitted twice.
const WAKE_ENABLED = !API_BASE.includes("localhost") && !API_BASE.includes("127.0.0.1");
const WAKE_DELAYS_MS = [2000, 3000, 4000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000];
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithWake(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (!WAKE_ENABLED || method !== "GET") {
    return fetch(url, init);
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (![502, 503, 504].includes(res.status)) {
        if (attempt > 0) window.dispatchEvent(new Event("api:awake"));
        return res;
      }
    } catch {
      // a network error: the server is probably still waking up
    }

    const delay = WAKE_DELAYS_MS[attempt];
    if (delay === undefined) {
      window.dispatchEvent(new Event("api:awake"));
      throw new TypeError("The server is not responding");
    }
    window.dispatchEvent(new Event("api:waking"));
    await sleep(delay);
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

  const res = await fetchWithWake(`${API_BASE}${path}`, { ...options, headers });

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
