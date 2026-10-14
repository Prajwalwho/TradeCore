import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, orders } from "../../db/schema.js";

// Open limit orders for one symbol, summed per side: total quantity waiting, and the best price.
export async function getDepth(symbol: string) {
  const rows = await db
    .select({
      side: orders.side,
      qty: sql<string>`coalesce(sum(${orders.quantity} - ${orders.filledQuantity}), 0)`,
      maxPrice: sql<string | null>`max(${orders.price})`,
      minPrice: sql<string | null>`min(${orders.price})`,
    })
    .from(orders)
    .innerJoin(instruments, eq(orders.instrumentId, instruments.id))
    .where(
      and(
        eq(instruments.symbol, symbol),
        eq(orders.type, "LIMIT"),
        inArray(orders.status, ["PENDING", "PARTIALLY_FILLED"])
      )
    )
    .groupBy(orders.side);

  const buy = rows.find((r) => r.side === "BUY");
  const sell = rows.find((r) => r.side === "SELL");

  return {
    bidQty: Number(buy?.qty ?? 0),
    askQty: Number(sell?.qty ?? 0),
    bestBid: buy?.maxPrice != null ? Number(buy.maxPrice) : null,
    bestAsk: sell?.minPrice != null ? Number(sell.minPrice) : null,
  };
}