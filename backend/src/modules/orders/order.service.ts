import { accountRepository } from "../accounts/account.repository.js";
import { instrumentRepository } from "../instruments/instrument.repository.js";
import {
  engineClient,
  EngineRejectedError,
  EngineUnavailableError,
} from "../engine/engine.client.js";
import { settlementService } from "../settlement/settlement.service.js";
import { orderRepository, type OrderRow } from "./order.repository.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal, decimalToCents, priceToCents } from "../../utils/money.js";
import { createSerialQueue } from "../../utils/serial-queue.js";
import type { PlaceOrderInput } from "./order.schema.js";
import { positionRepository } from "../positions/position.repository.js";
import { db } from "../../db/postgres.js";

// Funds check -> persist -> match -> settle must not interleave between orders,
// or two orders could both pass the same funds check.
const runExclusively = createSerialQueue();

function toOrderResponse(order: OrderRow, symbol: string) {
  return {
    id: order.id,
    symbol,
    side: order.side,
    type: order.type,
    quantity: order.quantity,
    filledQuantity: order.filledQuantity,
    price: order.price,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  };
}

async function placeOrderNow(userId: string, input: PlaceOrderInput) {
  const account = await accountRepository.findByUserId(userId);
  if (!account) {
    throw new AppError("Account not found", 404);
  }

  const symbol = input.symbol.toUpperCase();
  const instrument = await instrumentRepository.findBySymbol(symbol);
  if (!instrument) {
    throw new AppError(`Unknown instrument: ${symbol}`, 404);
  }

  const limitCents = input.price === undefined ? undefined : priceToCents(input.price);

  // The price the engine will enforce: the limit price for limit orders, and for
  // market buys the most per share this buyer could possibly afford.
  let engineCents = limitCents;

  if (input.side === "BUY") {
    const reservedCents = await orderRepository.reservedCents(account.id);
    const availableCents = decimalToCents(account.balance) - reservedCents;

    if (input.type === "LIMIT") {
      if (limitCents === undefined) {
        throw new AppError("price is required for LIMIT orders", 400);
      }
      if (limitCents * input.quantity > availableCents) {
        throw new AppError("Insufficient funds", 422);
      }
    } else {
      const capCents = Math.floor(availableCents / input.quantity);
      if (capCents < 1) {
        throw new AppError("Insufficient funds", 422);
      }
      engineCents = capCents;
    }
  } else {
      const held = await positionRepository.holdingsFor(account.id, instrument.id);
      const committed = await db.transaction((tx) =>
      positionRepository.sharesCommittedToOpenSells(tx, account.id, instrument.id)
      );
      const available = held - committed;

      if (input.quantity > available) {
        throw new AppError("Insufficient shares", 422);
      }
    }
  // SELL orders are not checked yet: they need positions (Day 19).

  // 1. Persist first: the database is the source of truth.
  const order = await orderRepository.create({
    accountId: account.id,
    instrumentId: instrument.id,
    side: input.side,
    type: input.type,
    quantity: input.quantity,
    price: limitCents === undefined ? null : centsToDecimal(limitCents),
  });

  // 2. Match.
  let result: Awaited<ReturnType<typeof engineClient.submitOrder>>;
  try {
    result = await engineClient.submitOrder({
      symbol,
      orderId: order.id,
      accountId: account.id,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: engineCents === undefined ? undefined : engineCents / 100,
    });
  } catch (err) {
    if (err instanceof EngineRejectedError) {
      await orderRepository.updateAfterMatch(order.id, "REJECTED", 0);
      throw new AppError(`Order rejected by engine: ${err.message}`, 422);
    }
    if (err instanceof EngineUnavailableError) {
      // The outcome is unknown, so the order stays PENDING for later reconciliation.
      throw new AppError("Matching engine unavailable; order left pending", 503);
    }
    throw err;
  }

  // 3. Settle: trades, order updates and cash movements in one transaction.
  try {
    const updated = await settlementService.settle({
      orderId: order.id,
      orderType: input.type,
      done: result.done,
      events: result.events,
    });
    return toOrderResponse(updated, symbol);
  } catch (err) {
    // The engine has matched but Postgres did not record it: fail-stop. Halting the
    // engine stops any further matching on state that is ahead of the database.
    console.error("[settlement] FAILED after the engine matched; halting the engine", err);
    await engineClient.stop();
    throw new AppError("Settlement failed; matching halted for safety", 500);
  }
}

export const orderService = {
  placeOrder(userId: string, input: PlaceOrderInput) {
    return runExclusively(() => placeOrderNow(userId, input));
  },

  async listOrders(userId: string) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const rows = await orderRepository.findByAccountId(account.id);
    return rows.map(({ order, symbol }) => toOrderResponse(order, symbol));
  },
};