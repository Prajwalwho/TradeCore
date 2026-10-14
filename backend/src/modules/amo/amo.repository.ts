import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, scheduledOrders } from "../../db/schema.js";

export type AmoRow = typeof scheduledOrders.$inferSelect;

export const amoRepository = {
  async create(values: typeof scheduledOrders.$inferInsert) {
    const [row] = await db.insert(scheduledOrders).values(values).returning();
    if (!row) throw new Error("Failed to create AMO order");
    return row;
  },

  async listByAccount(accountId: string) {
    return db
      .select({ amo: scheduledOrders, symbol: instruments.symbol })
      .from(scheduledOrders)
      .innerJoin(instruments, eq(scheduledOrders.instrumentId, instruments.id))
      .where(eq(scheduledOrders.accountId, accountId))
      .orderBy(desc(scheduledOrders.createdAt));
  },

  async listScheduled() {
    return db
      .select({ amo: scheduledOrders, symbol: instruments.symbol })
      .from(scheduledOrders)
      .innerJoin(instruments, eq(scheduledOrders.instrumentId, instruments.id))
      .where(eq(scheduledOrders.status, "SCHEDULED"))
      .orderBy(asc(scheduledOrders.createdAt));
  },

  async cancel(id: string, accountId: string) {
    const [row] = await db
      .update(scheduledOrders)
      .set({ status: "CANCELLED" })
      .where(
        and(
          eq(scheduledOrders.id, id),
          eq(scheduledOrders.accountId, accountId),
          eq(scheduledOrders.status, "SCHEDULED")
        )
      )
      .returning();
    return row ?? null;
  },

  // Atomically takes ownership of a scheduled order so it can never run twice.
  async claim(id: string) {
    const [row] = await db
      .update(scheduledOrders)
      .set({ status: "PROCESSING" })
      .where(and(eq(scheduledOrders.id, id), eq(scheduledOrders.status, "SCHEDULED")))
      .returning();
    return row ?? null;
  },

  async finish(id: string, status: "EXECUTED" | "FAILED", note: string | null) {
    await db.update(scheduledOrders).set({ status, note }).where(eq(scheduledOrders.id, id));
  },
};