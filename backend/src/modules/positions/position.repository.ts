import { and, eq } from "drizzle-orm";
import { db } from "../../db/postgres.js";
import { instruments, positions } from "../../db/schema.js";

export type PositionRow = typeof positions.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const positionRepository = {
  async findForUpdate(tx: Tx, accountId: string, instrumentId: string): Promise<PositionRow | null> {
    const [row] = await tx
      .select()
      .from(positions)
      .where(and(eq(positions.accountId, accountId), eq(positions.instrumentId, instrumentId)))
      .for("update"); // locks the row so two settlements can't read-modify-write it at once
    return row ?? null;
  },

  // A buy: blends the new shares into the running average cost. Realized P&L is untouched.
  async applyBuy(tx: Tx, accountId: string, instrumentId: string, quantity: number, priceCents: number) {
    const existing = await this.findForUpdate(tx, accountId, instrumentId);

    if (!existing) {
      const [row] = await tx
        .insert(positions)
        .values({ accountId, instrumentId, quantity, avgCostCents: priceCents })
        .returning();
      return row!;
    }

    const totalCostCents = existing.quantity * existing.avgCostCents + quantity * priceCents;
    const newQuantity = existing.quantity + quantity;
    const newAvgCostCents = Math.round(totalCostCents / newQuantity);

    const [row] = await tx
      .update(positions)
      .set({ quantity: newQuantity, avgCostCents: newAvgCostCents, updatedAt: new Date() })
      .where(eq(positions.id, existing.id))
      .returning();
    return row!;
  },

  // A sell: reduces quantity and realizes (sale price - avg cost) x quantity. Avg cost is unchanged.
  async applySell(tx: Tx, accountId: string, instrumentId: string, quantity: number, priceCents: number) {
    const existing = await this.findForUpdate(tx, accountId, instrumentId);

    if (!existing || existing.quantity < quantity) {
      throw new Error(
        `position shortfall: account ${accountId} has ${existing?.quantity ?? 0} of ${instrumentId}, needs ${quantity}`
      );
    }

    const realizedDeltaCents = (priceCents - existing.avgCostCents) * quantity;

    const [row] = await tx
      .update(positions)
      .set({
        quantity: existing.quantity - quantity,
        realizedPnlCents: existing.realizedPnlCents + realizedDeltaCents,
        updatedAt: new Date(),
      })
      .where(eq(positions.id, existing.id))
      .returning();
    return row!;
  },

  async findByAccountId(accountId: string) {
    return db
      .select({ position: positions, symbol: instruments.symbol })
      .from(positions)
      .innerJoin(instruments, eq(positions.instrumentId, instruments.id))
      .where(eq(positions.accountId, accountId));
  },

  // Shares already promised to other open sell orders for this instrument, so the same
  // shares can't back two sell orders at once. Queried, not stored, same idea as Day 18's
  // reservedCents for cash.
  async sharesCommittedToOpenSells(tx: Tx, accountId: string, instrumentId: string): Promise<number> {
    const { orders } = await import("../../db/schema.js");
    const { sql, inArray } = await import("drizzle-orm");
    const [row] = await tx
      .select({
        committed: sql<string>`coalesce(sum(${orders.quantity} - ${orders.filledQuantity}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, accountId),
          eq(orders.instrumentId, instrumentId),
          eq(orders.side, "SELL"),
          inArray(orders.status, ["PENDING", "PARTIALLY_FILLED"])
        )
      );
    return Number(row?.committed ?? 0);
  },
    async holdingsFor(accountId: string, instrumentId: string): Promise<number> {
    const [row] = await db
      .select({ quantity: positions.quantity })
      .from(positions)
      .where(and(eq(positions.accountId, accountId), eq(positions.instrumentId, instrumentId)));
    return row?.quantity ?? 0;
  },
};