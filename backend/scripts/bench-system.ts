import { sql } from "drizzle-orm";
import { config } from "../src/config/env.js";
import { db } from "../src/db/postgres.js";
import { instruments, positions } from "../src/db/schema.js";
import { engineClient } from "../src/modules/engine/engine.client.js";
import { userRepository } from "../src/modules/users/user.repository.js";
import { accountRepository } from "../src/modules/accounts/account.repository.js";
import { orderService } from "../src/modules/orders/order.service.js";

// Measures the FULL order path: funds check, Postgres, the C++ engine, settlement transaction.
// Usage: DB_NAME=paper_trading_test npx tsx scripts/bench-system.ts [pairs]
const PAIRS = Number(process.argv[2] ?? 500);

async function totalCash(): Promise<number> {
  const r = await db.execute(sql`select sum(balance)::text as total from accounts`);
  return Number((r.rows[0] as { total: string }).total);
}

async function main() {
  if (config.database.name !== "paper_trading_test") {
    throw new Error(`Refusing to run on "${config.database.name}". Use DB_NAME=paper_trading_test.`);
  }

  await engineClient.start();
  await db.execute(
    sql`truncate table trades, realized_pnl_events, scheduled_orders, watchlist_items, orders, positions, auth_tokens, accounts, users, instruments restart identity cascade`
  );

  const [inst] = await db.insert(instruments).values({ symbol: "BENCH", name: "Benchmark Co" }).returning();
  const seller = await userRepository.create("bench-seller@test.local", "x");
  const buyer = await userRepository.create("bench-buyer@test.local", "x");
  const sellerAccount = await accountRepository.createForUser(seller.id);
  await accountRepository.createForUser(buyer.id);
  await db.insert(positions).values({
    accountId: sellerAccount.id,
    instrumentId: inst!.id,
    quantity: 1_000_000,
    avgCostCents: 5000,
  });

  const cashBefore = await totalCash();
  const start = process.hrtime.bigint();

  for (let i = 0; i < PAIRS; i++) {
    await orderService.placeOrder(seller.id, { symbol: "BENCH", side: "SELL", type: "LIMIT", quantity: 1, price: 100 });
    await orderService.placeOrder(buyer.id, { symbol: "BENCH", side: "BUY", type: "MARKET", quantity: 1 });
  }

  const seconds = Number(process.hrtime.bigint() - start) / 1e9;
  const orders = PAIRS * 2;
  const cashAfter = await totalCash();

  console.log(`Full path: ${Math.round(orders / seconds).toLocaleString()} orders/sec (${orders} orders, ${PAIRS} settled trades, ${seconds.toFixed(2)}s)`);
  console.log(`Settled trades: ${Math.round(PAIRS / seconds).toLocaleString()} per second, each updating cash, positions and order status in one Postgres transaction`);
  console.log(cashAfter === cashBefore ? "Money conserved: yes" : `MONEY NOT CONSERVED: ${cashBefore} -> ${cashAfter}`);

  await engineClient.stop();
  process.exit(cashAfter === cashBefore ? 0 : 1);
}

main();