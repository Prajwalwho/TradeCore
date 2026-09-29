import { accountRepository } from "../accounts/account.repository.js";
import { positionRepository } from "../positions/position.repository.js";   // was "./position.repository.js"
import { marketDataService } from "../market-data/market-data.service.js";
import { AppError } from "../../utils/app-error.js";
import { centsToDecimal, decimalToCents, priceToCents } from "../../utils/money.js";

export const portfolioService = {
  async getPortfolio(userId: string) {
    const account = await accountRepository.findByUserId(userId);
    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const rows = await positionRepository.findByAccountId(account.id);
    const held = rows.filter(({ position }) => position.quantity > 0);

    let holdingsValueCents = 0;

    const positions = held.map(({ position, symbol }) => {
      const live = marketDataService.getPrice(symbol);
      const realizedCents = position.realizedPnlCents;

      if (!live) {
        // Price generator hasn't produced this symbol yet: report what we can, not an error.
        return {
          symbol,
          quantity: position.quantity,
          avgCost: centsToDecimal(position.avgCostCents),
          currentPrice: null,
          marketValue: null,
          unrealizedPnl: null,
          realizedPnl: centsToDecimal(realizedCents),
          totalPnl: null,
        };
      }

      const currentPriceCents = priceToCents(live.price);
      const marketValueCents = currentPriceCents * position.quantity;
      const unrealizedCents = (currentPriceCents - position.avgCostCents) * position.quantity;

      holdingsValueCents += marketValueCents;

      return {
        symbol,
        quantity: position.quantity,
        avgCost: centsToDecimal(position.avgCostCents),
        currentPrice: centsToDecimal(currentPriceCents),
        marketValue: centsToDecimal(marketValueCents),
        unrealizedPnl: centsToDecimal(unrealizedCents),
        realizedPnl: centsToDecimal(realizedCents),
        totalPnl: centsToDecimal(unrealizedCents + realizedCents),
      };
    });

    const cashCents = decimalToCents(account.balance);

    return {
      cash: centsToDecimal(cashCents),
      positions,
      holdingsValue: centsToDecimal(holdingsValueCents),
      totalValue: centsToDecimal(cashCents + holdingsValueCents),
    };
  },
};