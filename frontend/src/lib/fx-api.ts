import { apiFetch } from "./api-client";

export type FxInfo = {
  usdInr: number | null;
  updatedAt: string | null;
  usdSymbols: string[];
};

export function fetchFx(): Promise<FxInfo> {
  return apiFetch<FxInfo>("/fx");
}