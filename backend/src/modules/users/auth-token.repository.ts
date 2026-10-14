import { and, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../db/postgres.js";
import { authTokens } from "../../db/schema.js";

export type TokenType = "VERIFY_EMAIL" | "RESET_PASSWORD";

// Only a hash is stored, so a leaked database cannot be used to take over accounts.
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export const authTokenRepository = {
  // Creates a single-use token. Older unused tokens of the same type for this user stop working.
  async issue(userId: string, type: TokenType, ttlMs: number): Promise<string> {
    const token = randomBytes(32).toString("hex");

    await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt))
      );

    await db.insert(authTokens).values({
      userId,
      type,
      tokenHash: hash(token),
      expiresAt: new Date(Date.now() + ttlMs),
    });

    return token;
  },

  // Uses a token exactly once. Returns the user id, or null if it is wrong, expired or already used.
  async consume(type: TokenType, token: string): Promise<string | null> {
    const [row] = await db
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.tokenHash, hash(token)),
          eq(authTokens.type, type),
          isNull(authTokens.usedAt),
          gt(authTokens.expiresAt, new Date())
        )
      )
      .returning();

    return row?.userId ?? null;
  },
};