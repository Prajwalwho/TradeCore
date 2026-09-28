import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { accounts, orders, trades } from "../../db/schema.js";
import type { EngineEvent, EngineSubmitDone } from "../engine/engine.client.js";
import type { OrderRow } from "../orders/order.repository.js";
import { centsToDecimal, priceToCents } from "../../utils/money.js";

export type SettleInput = {
  orderId: string;
  orderType: "MARKET" | "LIMIT";
  done: EngineSubmitDone;
  events: EngineEvent[];
};

export const settlementService = {
  // Applies the outcome of one engine command to Postgres, all or nothing.
  async settle(input: SettleInput): Promise<OrderRow> {
    const executed = input.events.flatMap((e) =>
      e.event === "TRADE_EXECUTED" && e.trade ? [e.trade] : []
    );

    return db.transaction(async (tx) => {
      // 1. Load every order that took part
      const ids = new Set<string>([input.orderId]);
      for (const t of executed) {
        ids.add(t.buyOrderId);
        ids.add(t.sellOrderId);
      }

      const rows = await tx.select().from(orders).where(inArray(orders.id, [...ids]));
      const byId = new Map(rows.map((r) => [r.id, r]));

      const incoming = byId.get(input.orderId);
      if (!incoming) {
        throw new Error(`order ${input.orderId} not found during settlement`);
      }

      // 2. Work out trade rows, fills per order, and net cash per account
      const tradeRows: (typeof trades.$inferInsert)[] = [];
      const filledDelta = new Map<string, number>();
      const cashDelta = new Map<string, number>();

      for (const t of executed) {
        const buy = byId.get(t.buyOrderId);
        const sell = byId.get(t.sellOrderId);
        if (!buy || !sell) {
          throw new Error(`trade ${t.id} references an unknown order`);
        }

        const priceCents = priceToCents(t.price);
        const costCents = priceCents * t.quantity;

        tradeRows.push({
          instrumentId: incoming.instrumentId,
          buyOrderId: buy.id,
          sellOrderId: sell.id,
          price: centsToDecimal(priceCents),
          quantity: t.quantity,
          executedAt: new Date(t.executedAtMs),
        });

        filledDelta.set(buy.id, (filledDelta.get(buy.id) ?? 0) + t.quantity);
        filledDelta.set(sell.id, (filledDelta.get(sell.id) ?? 0) + t.quantity);
        cashDelta.set(buy.accountId, (cashDelta.get(buy.accountId) ?? 0) - costCents);
        cashDelta.set(sell.accountId, (cashDelta.get(sell.accountId) ?? 0) + costCents);
      }

      // Sanity check: the fills we derived must match what the engine says the order filled.
      if ((filledDelta.get(input.orderId) ?? 0) !== input.done.filledQuantity) {
        throw new Error("engine fill quantity does not match its trade events");
      }

      // 3. Record the trades
      if (tradeRows.length > 0) {
        await tx.insert(trades).values(tradeRows);
      }

      // 4. Resting orders that were matched: add the new fills and derive the new status
      for (const [orderId, qty] of filledDelta) {
        if (orderId === input.orderId) {
          continue;
        }
        await tx
          .update(orders)
          .set({
            filledQuantity: sql`${orders.filledQuantity} + ${qty}`,
            status: sql`CASE WHEN ${orders.filledQuantity} + ${qty} >= ${orders.quantity}
                             THEN 'FILLED'::order_status
                             ELSE 'PARTIALLY_FILLED'::order_status END`,
          })
          .where(eq(orders.id, orderId));
      }

      // 5. The incoming order: the engine reported its final state.
      // A market order never rests, so a partial fill means the rest was cancelled.
      const status: OrderRow["status"] =
        input.orderType === "MARKET" && input.done.status === "PARTIALLY_FILLED"
          ? "CANCELLED"
          : input.done.status;

      const [updated] = await tx
        .update(orders)
        .set({ status, filledQuantity: input.done.filledQuantity })
        .where(eq(orders.id, input.orderId))
        .returning();

      if (!updated) {
        throw new Error(`order ${input.orderId} vanished during settlement`);
      }

      // 6. Move the money. Accounts are updated in a fixed order so two settlements
      // can never wait on each other's rows.
      for (const accountId of [...cashDelta.keys()].sort()) {
        const delta = cashDelta.get(accountId) ?? 0;
        if (delta === 0) {
          continue;
        }
        await tx
          .update(accounts)
          .set({ balance: sql`${accounts.balance} + ${centsToDecimal(delta)}::numeric` })
          .where(eq(accounts.id, accountId));
      }

      return updated;
    });
  },
};