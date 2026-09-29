import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { accounts, orders, trades } from "../../db/schema.js";
import { positionRepository } from "../positions/position.repository.js";
import { accountRepository } from "../accounts/account.repository.js";
import { publishUserEvent } from "../../websocket/user-events.js";
import type { EngineEvent, EngineSubmitDone } from "../engine/engine.client.js";
import type { OrderRow } from "../orders/order.repository.js";
import { centsToDecimal, priceToCents } from "../../utils/money.js";

export type SettleInput = {
  orderId: string;
  orderType: "MARKET" | "LIMIT";
  symbol: string;
  done: EngineSubmitDone;
  events: EngineEvent[];
};

export const settlementService = {
  async settle(input: SettleInput): Promise<OrderRow> {
    const executed = input.events.flatMap((e) =>
      e.event === "TRADE_EXECUTED" && e.trade ? [e.trade] : []
    );

    return db.transaction(async (tx) => {
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

        // Positions: buyer's holding grows, seller's holding shrinks and realizes P&L.
        // Fixed account-id order so two concurrent settlements touching the same two
        // accounts always take row locks in the same order and can't deadlock.
        const [first, second] = buy.accountId < sell.accountId ? [buy, sell] : [sell, buy];
        for (const side of [first, second]) {
          if (side === buy) {
            await positionRepository.applyBuy(tx, buy.accountId, incoming.instrumentId, t.quantity, priceCents);
          } else {
            await positionRepository.applySell(tx, sell.accountId, incoming.instrumentId, t.quantity, priceCents);
          }
        }
      }

      if ((filledDelta.get(input.orderId) ?? 0) !== input.done.filledQuantity) {
        throw new Error("engine fill quantity does not match its trade events");
      }

      if (tradeRows.length > 0) {
        await tx.insert(trades).values(tradeRows);
      }

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

      // A market order never rests, so an unfilled remainder means the rest was cancelled.
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

      // Notify every account whose order changed, including resting orders
      // that were matched by someone else's trade just now.
      for (const orderId of ids) {
        const touched = byId.get(orderId);
        if (!touched) continue;

        const isIncoming = orderId === input.orderId;
        const newFilledQuantity = isIncoming
          ? input.done.filledQuantity
          : touched.filledQuantity + (filledDelta.get(orderId) ?? 0);
                const newStatus: OrderRow["status"] = isIncoming
          ? status
          : newFilledQuantity >= touched.quantity
            ? "FILLED"
            : "PARTIALLY_FILLED";

        const userId = await accountRepository.findUserIdByAccountId(touched.accountId);
        if (!userId) continue;

        await publishUserEvent(userId, {
          type: "order_update",
          orderId: touched.id,
          status: newStatus,
          filledQuantity: newFilledQuantity,
          symbol: input.symbol,
        });
      }

      for (const t of tradeRows) {
        const buyerUserId = await accountRepository.findUserIdByAccountId(
          byId.get(t.buyOrderId)!.accountId
        );
        const sellerUserId = await accountRepository.findUserIdByAccountId(
          byId.get(t.sellOrderId)!.accountId
        );

        if (buyerUserId) {
          await publishUserEvent(buyerUserId, {
            type: "trade",
            tradeId: `${t.buyOrderId}-${t.sellOrderId}`,
            symbol: input.symbol,
            side: "BUY",
            price: t.price as string,
            quantity: t.quantity,
            orderId: t.buyOrderId,
          });
        }
        if (sellerUserId) {
          await publishUserEvent(sellerUserId, {
            type: "trade",
            tradeId: `${t.buyOrderId}-${t.sellOrderId}`,
            symbol: input.symbol,
            side: "SELL",
            price: t.price as string,
            quantity: t.quantity,
            orderId: t.sellOrderId,
          });
        }
      }

      return updated;
    });
  },
};