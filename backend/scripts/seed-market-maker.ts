import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/postgres.js";
import { accounts, instruments, positions, users } from "../src/db/schema.js";

const MM_EMAIL = "market-maker@paper.local";
const MM_CASH = "10000000000.00"; // 1,000 crore
const MM_SHARES = 1_000_000;
const MM_AVG_COST_CENTS = 100_000;

async function main() {
  let user = (await db.select().from(users).where(eq(users.email, MM_EMAIL)))[0];
  if (!user) {
    // Random password nobody knows: this account can never be logged into.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    user = (await db.insert(users).values({ email: MM_EMAIL, passwordHash }).returning())[0];
  }
  if (!user) throw new Error("could not create market-maker user");

  let account = (await db.select().from(accounts).where(eq(accounts.userId, user.id)))[0];
  if (!account) {
    account = (await db.insert(accounts).values({ userId: user.id, balance: MM_CASH }).returning())[0];
  }
  if (!account) throw new Error("could not create market-maker account");

  for (const instrument of await db.select().from(instruments)) {
    await db
      .insert(positions)
      .values({
        accountId: account.id,
        instrumentId: instrument.id,
        quantity: MM_SHARES,
        avgCostCents: MM_AVG_COST_CENTS,
      })
      .onConflictDoNothing(); // re-running never resets existing inventory
  }

  console.log("Market maker ready.");
  process.exit(0);
}

main();