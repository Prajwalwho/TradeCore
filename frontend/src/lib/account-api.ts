import { apiFetch } from "./api-client";

export type Account = {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
};

export function fetchAccount(): Promise<Account> {
  return apiFetch<Account>("/account");
}