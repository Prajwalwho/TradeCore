import { eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { accounts } from "../../db/schema.js";

const STARTING_BALANCE = "1000000.00";

export const accountRepository = {
  async createForUser(userId: string) {
    const [account] = await db
      .insert(accounts)
      .values({ userId, balance: STARTING_BALANCE })
      .returning();

    if (!account) {
      throw new Error("Failed to create account");
    }

    return account;
  },

  async findByUserId(userId: string) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
    return account ?? null;
  },

    async findUserIdByAccountId(accountId: string) {
    const [account] = await db
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    return account?.userId ?? null;
  },
};