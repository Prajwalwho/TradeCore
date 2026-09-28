import { accountRepository } from "../accounts/account.repository.js";
import { instrumentRepository } from "../instruments/instrument.repository.js";
import {
  engineClient,
  EngineRejectedError,
  EngineUnavailableError,
} from "../engine/engine.client.js";
import { orderRepository, type OrderRow } from "./order.repository.js";
import { AppError } from "../../utils/app-error.js";
import type { PlaceOrderInput } from "./order.schema.js";

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

export const orderService = {
  async placeOrder(userId: string, input: PlaceOrderInput) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const symbol = input.symbol.toUpperCase();
    const instrument = await instrumentRepository.findBySymbol(symbol);
    if (!instrument) {
      throw new AppError(`Unknown instrument: ${symbol}`, 404);
    }

    // Round to 4 decimals once, and use the same value for the database and the engine,
    // so both always agree and equal prices land on the same price level.
    const price =
      input.price === undefined ? undefined : Math.round(input.price * 10000) / 10000;

    // 1. Persist first: the database is the source of truth.
    const order = await orderRepository.create({
      accountId: account.id,
      instrumentId: instrument.id,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: price === undefined ? null : price.toFixed(4),
    });

    // 2. Match.
    try {
      const { done } = await engineClient.submitOrder({
        symbol,
        orderId: order.id,
        accountId: account.id,
        side: input.side,
        type: input.type,
        quantity: input.quantity,
        price,
      });

      const updated = await orderRepository.updateAfterMatch(
        order.id,
        done.status,
        done.filledQuantity
      );
      return toOrderResponse(updated, symbol);
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