import { desc, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, realizedPnlEvents } from "../../db/schema.js";
import { accountRepository } from "../accounts/account.repository.js";
import { userRepository } from "../users/user.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal, decimalToCents } from "../../utils/money.js";

export const profileService = {
  async getProfile(userId: string) {
    const [user, account] = await Promise.all([
      userRepository.findById(userId),
      accountRepository.findByUserId(userId),
    ]);
    if (!user || !account) {
      throw new AppError("Account not found", 404);
    }

    const balanceCents = decimalToCents(account.balance);
    const reservedCents = await orderRepository.reservedCents(account.id);

    const rows = await db
      .select({ event: realizedPnlEvents, symbol: instruments.symbol })
      .from(realizedPnlEvents)
      .innerJoin(instruments, eq(realizedPnlEvents.instrumentId, instruments.id))
      .where(eq(realizedPnlEvents.accountId, account.id))
      .orderBy(desc(realizedPnlEvents.createdAt));

    let profitCents = 0;
    let lossCents = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    const bySymbol = new Map<string, { pnl: number; trades: number }>();

    for (const { event, symbol } of rows) {
      const pnl = event.pnlCents;
      if (pnl > 0) {
        profitCents += pnl;
        positiveCount++;
      } else if (pnl < 0) {
        lossCents += -pnl;
        negativeCount++;
      }
      const entry = bySymbol.get(symbol) ?? { pnl: 0, trades: 0 };
      entry.pnl += pnl;
      entry.trades += 1;
      bySymbol.set(symbol, entry);
    }

    return {
      email: user.email,
      totalFunds: centsToDecimal(balanceCents),
      availableFunds: centsToDecimal(Math.max(0, balanceCents - reservedCents)),
      usedMargin: centsToDecimal(reservedCents),
      netProfit: centsToDecimal(profitCents),
      netLoss: centsToDecimal(lossCents),
      netPnl: centsToDecimal(profitCents - lossCents),
      positiveCount,
      negativeCount,
      bySymbol: Array.from(bySymbol.entries()).map(([symbol, v]) => ({
        symbol,
        pnl: centsToDecimal(v.pnl),
        trades: v.trades,
      })),
      recent: rows.slice(0, 20).map(({ event, symbol }) => ({
        symbol,
        quantity: event.quantity,
        avgCost: centsToDecimal(event.avgCostCents),
        sellPrice: centsToDecimal(event.sellPriceCents),
        pnl: centsToDecimal(event.pnlCents),
        time: event.createdAt.toISOString(),
      })),
    };
  },
};