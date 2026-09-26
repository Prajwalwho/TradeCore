import { accountRepository } from "./account.repository.js";
import { AppError } from "../../utils/app-error.js";

export const accountService = {
  async getAccountForUser(userId: string) {
    const account = await accountRepository.findByUserId(userId);

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    return account;
  },
};