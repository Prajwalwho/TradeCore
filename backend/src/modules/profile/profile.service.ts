import { desc, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, realizedPnlEvents } from "../../db/schema.js";
import { accountRepository } from "../accounts/account.repository.js";
import { userRepository } from "../users/user.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { positionRepository } from "../positions/position.repository.js";
import { marketDataService } from "../market-data/market-data.service.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal, decimalToCents, priceToCents } from "../../utils/money.js";

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

    // Shares still held: their value now, and the gain or loss that is not yet locked in.
    let holdingsCents = 0;
    let unrealizedCents = 0;
    for (const { position, symbol } of await positionRepository.findByAccountId(account.id)) {
      if (position.quantity <= 0) continue;
      const live = marketDataService.getPrice(symbol);
      if (!live) continue;
      const priceCents = priceToCents(live.price);
      holdingsCents += priceCents * position.quantity;
      unrealizedCents += (priceCents - position.avgCostCents) * position.quantity;
    }

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

    const realizedCents = profitCents - lossCents;

    return {
      email: user.email,
      totalFunds: centsToDecimal(balanceCents), // cash
      availableFunds: centsToDecimal(Math.max(0, balanceCents - reservedCents)),
      usedMargin: centsToDecimal(reservedCents),
      holdingsValue: centsToDecimal(holdingsCents),
      totalValue: centsToDecimal(balanceCents + holdingsCents),
      unrealizedPnl: centsToDecimal(unrealizedCents),
      netProfit: centsToDecimal(profitCents),
      netLoss: centsToDecimal(lossCents),
      netPnl: centsToDecimal(realizedCents),
      totalPnl: centsToDecimal(realizedCents + unrealizedCents),
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
