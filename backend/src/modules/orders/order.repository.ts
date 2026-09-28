import { desc, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, orders } from "../../db/schema.js";

export type OrderRow = typeof orders.$inferSelect;
type NewOrder = typeof orders.$inferInsert;
type OrderStatus = OrderRow["status"];

export const orderRepository = {
  async create(values: NewOrder) {
    const [order] = await db.insert(orders).values(values).returning();

    if (!order) {
      throw new Error("Failed to create order");
    }

    return order;
  },

  async updateAfterMatch(id: string, status: OrderStatus, filledQuantity: number) {
    const [order] = await db
      .update(orders)
      .set({ status, filledQuantity })
      .where(eq(orders.id, id))
      .returning();

    if (!order) {
      throw new Error("Order not found");
    }

    return order;
  },

  async findByAccountId(accountId: string) {
    return db
      .select({ order: orders, symbol: instruments.symbol })
      .from(orders)
      .innerJoin(instruments, eq(orders.instrumentId, instruments.id))
      .where(eq(orders.accountId, accountId))
      .orderBy(desc(orders.createdAt));
  },
};