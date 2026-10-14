import { accountRepository } from "../accounts/account.repository.js";
import { instrumentRepository } from "../instruments/instrument.repository.js";
import { orderService } from "../orders/order.service.js";
import { amoRepository, type AmoRow } from "./amo.repository.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal, priceToCents } from "../../utils/money.js";
import { exchangeFor, isExchangeOpen } from "../../config/exchanges.js";
import type { PlaceOrderInput } from "../orders/order.schema.js";

function toResponse(amo: AmoRow, symbol: string) {
  return {
    id: amo.id,
    symbol,
    side: amo.side,
    type: amo.type,
    quantity: amo.quantity,
    price: amo.price,
    status: amo.status,
    note: amo.note,
    createdAt: amo.createdAt.toISOString(),
  };
}

async function runDue(): Promise<void> {
  const rows = await amoRepository.listScheduled();
  for (const { amo, symbol } of rows) {
    const exchange = exchangeFor(symbol);
    if (!exchange || !isExchangeOpen(exchange)) continue;

    const claimed = await amoRepository.claim(amo.id);
    if (!claimed) continue;

    try {
      const userId = await accountRepository.findUserIdByAccountId(amo.accountId);
      if (!userId) throw new Error("account not found");

      await orderService.placeOrder(userId, {
        symbol,
        side: amo.side,
        type: amo.type,
        quantity: amo.quantity,
        ...(amo.price !== null ? { price: Number(amo.price) } : {}),
      } as PlaceOrderInput);

      await amoRepository.finish(amo.id, "EXECUTED", null);
      console.log(`[amo] executed ${amo.side} ${amo.quantity} ${symbol}`);
    } catch (err) {
      await amoRepository.finish(amo.id, "FAILED", (err as Error).message.slice(0, 250));
      console.warn(`[amo] failed ${symbol}: ${(err as Error).message}`);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export const amoService = {
  async place(userId: string, input: PlaceOrderInput) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) throw new AppError("Account not found", 404);

    const symbol = input.symbol.toUpperCase();
    const instrument = await instrumentRepository.findBySymbol(symbol);
    if (!instrument) throw new AppError(`Unknown instrument: ${symbol}`, 404);

    const limitCents = input.price === undefined ? null : priceToCents(input.price);
    const row = await amoRepository.create({
      accountId: account.id,
      instrumentId: instrument.id,
      side: input.side,
      type: input.type,
      quantity: input.quantity,
      price: limitCents === null ? null : centsToDecimal(limitCents),
    });
    return toResponse(row, symbol);
  },

  async list(userId: string) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) throw new AppError("Account not found", 404);
    const rows = await amoRepository.listByAccount(account.id);
    return rows.map(({ amo, symbol }) => toResponse(amo, symbol));
  },

  async cancel(userId: string, id: string) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) throw new AppError("Account not found", 404);
    const row = await amoRepository.cancel(id, account.id);
    if (!row) throw new AppError("AMO order not found or already processed", 404);
    return { id: row.id, status: row.status };
  },

  startScheduler() {
    timer = setInterval(() => {
      if (running) return;
      running = true;
      runDue()
        .catch((err) => console.error("[amo] scheduler error", err))
        .finally(() => {
          running = false;
        });
    }, 30_000);
  },

  stopScheduler() {
    if (timer) clearInterval(timer);
    timer = null;
  },
};