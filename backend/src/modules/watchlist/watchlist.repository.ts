import { and, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, watchlistItems } from "../../db/schema.js";

export const watchlistRepository = {
  async list(userId: string) {
    return db
      .select({ symbol: instruments.symbol, name: instruments.name })
      .from(watchlistItems)
      .innerJoin(instruments, eq(watchlistItems.instrumentId, instruments.id))
      .where(eq(watchlistItems.userId, userId))
      .orderBy(watchlistItems.createdAt);
  },

  async add(userId: string, instrumentId: string) {
    await db.insert(watchlistItems).values({ userId, instrumentId }).onConflictDoNothing();
  },

  async remove(userId: string, instrumentId: string) {
    await db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.userId, userId), eq(watchlistItems.instrumentId, instrumentId)));
  },
};