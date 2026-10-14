import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, orders, trades } from "../../db/schema.js";
import { decimalToCents } from "../../utils/money.js";

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

    async findById(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order ?? null;
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

  // Cash tied up by this account's open limit buys: what is still unfilled x the limit price.
  // Derived from the orders table, so there is no second number that could drift out of sync.
  async reservedCents(accountId: string): Promise<number> {
    const [row] = await db
      .select({
        reserved: sql<string>`coalesce(sum((${orders.quantity} - ${orders.filledQuantity}) * ${orders.price}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, accountId),
          eq(orders.side, "BUY"),
          eq(orders.type, "LIMIT"),
          inArray(orders.status, ["PENDING", "PARTIALLY_FILLED"])
        )
      );

    return decimalToCents(row?.reserved ?? "0");
  },

    async findOpenLimitOrders() {
    return db
      .select({ order: orders, symbol: instruments.symbol })
      .from(orders)
      .innerJoin(instruments, eq(orders.instrumentId, instruments.id))
      .where(
        and(eq(orders.type, "LIMIT"), inArray(orders.status, ["PENDING", "PARTIALLY_FILLED"]))
      )
      .orderBy(orders.createdAt);
  },

    async findOpenByAccountId(accountId: string) {
    return db
      .select({ order: orders, symbol: instruments.symbol })
      .from(orders)
      .innerJoin(instruments, eq(orders.instrumentId, instruments.id))
      .where(
        and(eq(orders.accountId, accountId), inArray(orders.status, ["PENDING", "PARTIALLY_FILLED"]))
      );
  },

    // Average price an order actually filled at, from the trades table.
  async avgFillPrices(orderIds: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (orderIds.length === 0) return result;

    const totals = new Map<string, { notional: number; qty: number }>();
    const add = (rows: { orderId: string; notional: string; qty: string }[]) => {
      for (const r of rows) {
        const t = totals.get(r.orderId) ?? { notional: 0, qty: 0 };
        t.notional += Number(r.notional);
        t.qty += Number(r.qty);
        totals.set(r.orderId, t);
      }
    };

    add(
      await db
        .select({
          orderId: trades.buyOrderId,
          notional: sql<string>`sum(${trades.price} * ${trades.quantity})`,
          qty: sql<string>`sum(${trades.quantity})`,
        })
        .from(trades)
        .where(inArray(trades.buyOrderId, orderIds))
        .groupBy(trades.buyOrderId)
    );
    add(
      await db
        .select({
          orderId: trades.sellOrderId,
          notional: sql<string>`sum(${trades.price} * ${trades.quantity})`,
          qty: sql<string>`sum(${trades.quantity})`,
        })
        .from(trades)
        .where(inArray(trades.sellOrderId, orderIds))
        .groupBy(trades.sellOrderId)
    );

    for (const [id, t] of totals) {
      if (t.qty > 0) result.set(id, (t.notional / t.qty).toFixed(2));
    }
    return result;
  },
  
};