import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./postgres.js";
import { accounts, instruments, positions, users } from "./schema.js";
import { CATALOG } from "../config/catalog.js";
import { MM_EMAIL } from "../modules/market-maker/market-maker.service.js";

const MM_CASH = "10000000000.00"; // ₹1,000 crore
const MM_SHARES = 1_000_000;
const MM_AVG_COST_CENTS = 100_000;

// Everything below is safe to run on every start: it only adds what is missing.

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

export async function seedInstruments(): Promise<void> {
  for (const item of CATALOG) {
    await db
      .insert(instruments)
      .values({ symbol: item.symbol, name: item.name })
      .onConflictDoNothing();
  }
}

export async function ensureMarketMaker(): Promise<void> {
  let user = (await db.select().from(users).where(eq(users.email, MM_EMAIL)))[0];
  if (!user) {
    // A random password nobody knows: this account can never be logged into.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    user = (
      await db
        .insert(users)
        .values({ email: MM_EMAIL, passwordHash, emailVerifiedAt: new Date() })
        .returning()
    )[0];
  }
  if (!user) throw new Error("could not create the market-maker user");

  let account = (await db.select().from(accounts).where(eq(accounts.userId, user.id)))[0];
  if (!account) {
    account = (await db.insert(accounts).values({ userId: user.id, balance: MM_CASH }).returning())[0];
  }
  if (!account) throw new Error("could not create the market-maker account");

  for (const instrument of await db.select().from(instruments)) {
    await db
      .insert(positions)
      .values({
        accountId: account.id,
        instrumentId: instrument.id,
        quantity: MM_SHARES,
        avgCostCents: MM_AVG_COST_CENTS,
      })
      .onConflictDoNothing(); // never resets existing inventory
  }
}
