import { eq } from "drizzle-orm";
import { db } from "../src/db/postgres.js";
import { accounts, instruments, positions, users } from "../src/db/schema.js";

const email = process.argv[2];
const symbol = process.argv[3];
const quantity = Number(process.argv[4]);
const avgCostRupees = Number(process.argv[5]);

if (!email || !symbol || !quantity || !avgCostRupees) {
  console.error("Usage: tsx scripts/grant-shares.ts <email> <symbol> <quantity> <avgCostRupees>");
  process.exit(1);
}

async function main() {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`No user with email ${email}`);

  const [account] = await db.select().from(accounts).where(eq(accounts.userId, user.id));
  if (!account) throw new Error(`No account for ${email}`);

  const [instrument] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  if (!instrument) throw new Error(`No instrument ${symbol}`);

  const avgCostCents = Math.round(avgCostRupees * 100);

  await db
    .insert(positions)
    .values({ accountId: account.id, instrumentId: instrument.id, quantity, avgCostCents })
    .onConflictDoUpdate({
      target: [positions.accountId, positions.instrumentId],
      set: { quantity, avgCostCents },
    });

  console.log(`Granted ${quantity} ${symbol} to ${email} at avg cost ${avgCostRupees}`);
  process.exit(0);
}

main();