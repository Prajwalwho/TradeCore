import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { config } from "../src/config/env.js";
import { buildApp } from "../src/app.js";
import { db, pool } from "../src/db/postgres.js";
import { accounts, instruments, positions, users } from "../src/db/schema.js";
import { engineClient } from "../src/modules/engine/engine.client.js";
import { redisPublisher, redisSubscriber } from "../src/redis/redis.client.js";

let app: ReturnType<typeof buildApp>;
let symbolCounter = 0;

type Reply = { status: number; body: any };

// Every request comes from its own fake IP address, so the per-IP rate limits
// (for example 10 registrations an hour) do not trip over the test suite creating many users.
let requestCounter = 0;

async function api(method: "GET" | "POST" | "DELETE", url: string, token?: string, payload?: unknown): Promise<Reply> {
  requestCounter++;
  const res = await app.inject({
    method,
    url,
    remoteAddress: `10.${(requestCounter >> 16) & 255}.${(requestCounter >> 8) & 255}.${requestCounter & 255}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload !== undefined ? { payload: payload as object } : {}),
  });
  return { status: res.statusCode, body: res.json() };
}

// Each test trades its own symbol, so one test's resting orders never affect another.
async function newSymbol(): Promise<string> {
  const symbol = `TST${++symbolCounter}`;
  await db.insert(instruments).values({ symbol, name: `Test company ${symbolCounter}` });
  return symbol;
}

async function createUser(email: string, verified = true) {
  const reg = await api("POST", "/auth/register", undefined, { email, password: "password123" });
  assert.equal(reg.status, 200);
  if (verified) {
    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.email, email));
  }
  const login = await api("POST", "/auth/login", undefined, { email, password: "password123" });
  assert.equal(login.status, 200);

  const userId = login.body.data.user.id as string;
  const [account] = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return { userId, accountId: account!.id, token: login.body.data.accessToken as string };
}

async function giveShares(accountId: string, symbol: string, quantity: number, avgCostCents: number) {
  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  await db.insert(positions).values({ accountId, instrumentId: inst!.id, quantity, avgCostCents });
}

async function totalCash(): Promise<number> {
  const r = await db.execute(sql`select sum(balance)::text as total from accounts`);
  return Number((r.rows[0] as { total: string }).total);
}

async function balanceOf(accountId: string): Promise<number> {
  const [a] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  return Number(a!.balance);
}

async function holdingOf(accountId: string, symbol: string) {
  const [inst] = await db.select().from(instruments).where(eq(instruments.symbol, symbol));
  const rows = await db.select().from(positions).where(eq(positions.accountId, accountId));
  return rows.find((p) => p.instrumentId === inst!.id) ?? null;
}

const place = (token: string, body: object) => api("POST", "/orders", token, body);

describe("trading rules", () => {
  before(async () => {
    // Safety: these tests wipe tables, so they must only ever run on the test database.
    if (config.database.name !== "paper_trading_test") {
      throw new Error(`Refusing to run: database is "${config.database.name}", not "paper_trading_test"`);
    }
    await engineClient.start();
    await db.execute(
      sql`truncate table trades, realized_pnl_events, scheduled_orders, watchlist_items, orders, positions, auth_tokens, accounts, users, instruments restart identity cascade`
    );
    app = buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
    await engineClient.stop();
    await redisPublisher.quit();
    await redisSubscriber.quit();
    await pool.end();
  });

  test("register and login work, and a new account starts unverified", async () => {
    const user = await createUser("fresh@test.local", false);
    const me = await api("GET", "/auth/me", user.token);
    assert.equal(me.status, 200);
    assert.equal(me.body.data.emailVerified, false);
    assert.equal(await balanceOf(user.accountId), 1_000_000);
  });

  test("an unverified user cannot trade", async () => {
    const symbol = await newSymbol();
    const user = await createUser("unverified@test.local", false);
    const res = await place(user.token, { symbol, side: "BUY", type: "MARKET", quantity: 1 });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /verify your email/i);
  });

  test("a trade settles correctly and total cash is conserved", async () => {
    const symbol = await newSymbol();
    const seller = await createUser("seller1@test.local");
    const buyer = await createUser("buyer1@test.local");
    await giveShares(seller.accountId, symbol, 100, 5000); // avg cost 50.00

    const cashBefore = await totalCash();

    const sell = await place(seller.token, { symbol, side: "SELL", type: "LIMIT", quantity: 10, price: 100 });
    assert.equal(sell.status, 200);
    assert.equal(sell.body.data.status, "PENDING");

    const buy = await place(buyer.token, { symbol, side: "BUY", type: "MARKET", quantity: 10 });
    assert.equal(buy.status, 200);
    assert.equal(buy.body.data.status, "FILLED");
    assert.equal(buy.body.data.filledQuantity, 10);

    assert.equal(await balanceOf(buyer.accountId), 999_000);
    assert.equal(await balanceOf(seller.accountId), 1_001_000);
    assert.equal((await holdingOf(buyer.accountId, symbol))?.quantity, 10);

    const sellerPosition = await holdingOf(seller.accountId, symbol);
    assert.equal(sellerPosition?.quantity, 90);
    assert.equal(sellerPosition?.realizedPnlCents, 50_000); // (100.00 - 50.00) x 10, in cents

    assert.equal(await totalCash(), cashBefore, "money was created or destroyed");

    const orders = await api("GET", "/orders", seller.token);
    const sellerOrder = orders.body.data.find((o: { id: string }) => o.id === sell.body.data.id);
    assert.equal(sellerOrder.status, "FILLED");
  });

  test("a market order with nobody to trade against is rejected and no money moves", async () => {
    const symbol = await newSymbol();
    const buyer = await createUser("lonely@test.local");
    const cashBefore = await totalCash();

    const res = await place(buyer.token, { symbol, side: "BUY", type: "MARKET", quantity: 5 });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, "REJECTED");
    assert.equal(res.body.data.filledQuantity, 0);
    assert.equal(await balanceOf(buyer.accountId), 1_000_000);
    assert.equal(await totalCash(), cashBefore);
  });

  test("a market order bigger than the book fills what exists and cancels the rest", async () => {
    const symbol = await newSymbol();
    const seller = await createUser("seller2@test.local");
    const buyer = await createUser("buyer2@test.local");
    await giveShares(seller.accountId, symbol, 50, 5000);
    const cashBefore = await totalCash();

    await place(seller.token, { symbol, side: "SELL", type: "LIMIT", quantity: 5, price: 100 });
    const buy = await place(buyer.token, { symbol, side: "BUY", type: "MARKET", quantity: 8 });

    assert.equal(buy.body.data.filledQuantity, 5);
    assert.equal(buy.body.data.status, "CANCELLED");
    assert.equal((await holdingOf(buyer.accountId, symbol))?.quantity, 5);
    assert.equal(await balanceOf(buyer.accountId), 999_500);
    assert.equal(await totalCash(), cashBefore);
  });

  test("you cannot spend more cash than you have", async () => {
    const symbol = await newSymbol();
    const buyer = await createUser("broke@test.local");
    const res = await place(buyer.token, { symbol, side: "BUY", type: "LIMIT", quantity: 100_000, price: 100 });
    assert.equal(res.status, 422);
    assert.match(res.body.error.message, /insufficient funds/i);
  });

  test("you cannot sell shares you do not own", async () => {
    const symbol = await newSymbol();
    const user = await createUser("noshares@test.local");
    const res = await place(user.token, { symbol, side: "SELL", type: "LIMIT", quantity: 1, price: 100 });
    assert.equal(res.status, 422);
    assert.match(res.body.error.message, /insufficient shares/i);
  });

  test("the same shares cannot back two sell orders", async () => {
    const symbol = await newSymbol();
    const seller = await createUser("seller3@test.local");
    await giveShares(seller.accountId, symbol, 10, 5000);

    const first = await place(seller.token, { symbol, side: "SELL", type: "LIMIT", quantity: 10, price: 100 });
    assert.equal(first.status, 200);
    const second = await place(seller.token, { symbol, side: "SELL", type: "LIMIT", quantity: 1, price: 100 });
    assert.equal(second.status, 422);
  });

  test("cancelling an open buy order releases the reserved cash", async () => {
    const symbol = await newSymbol();
    const buyer = await createUser("canceller@test.local");

    const order = await place(buyer.token, { symbol, side: "BUY", type: "LIMIT", quantity: 10, price: 50 });
    assert.equal(order.body.data.status, "PENDING");
    assert.equal(Number((await api("GET", "/profile", buyer.token)).body.data.usedMargin), 500);

    const cancel = await api("DELETE", `/orders/${order.body.data.id}`, buyer.token);
    assert.equal(cancel.status, 200);
    assert.equal(cancel.body.data.status, "CANCELLED");
    assert.equal(Number((await api("GET", "/profile", buyer.token)).body.data.usedMargin), 0);
    assert.equal(await balanceOf(buyer.accountId), 1_000_000);
  });

  test("nobody can cancel someone else's order", async () => {
    const symbol = await newSymbol();
    const owner = await createUser("owner@test.local");
    const other = await createUser("intruder@test.local");

    const order = await place(owner.token, { symbol, side: "BUY", type: "LIMIT", quantity: 1, price: 10 });
    const res = await api("DELETE", `/orders/${order.body.data.id}`, other.token);
    assert.equal(res.status, 404);
  });

  test("price-time priority: the earlier order at the same price fills first", async () => {
    const symbol = await newSymbol();
    const first = await createUser("early@test.local");
    const second = await createUser("late@test.local");
    const buyer = await createUser("buyer3@test.local");
    await giveShares(first.accountId, symbol, 10, 5000);
    await giveShares(second.accountId, symbol, 10, 5000);

    const earlyOrder = await place(first.token, { symbol, side: "SELL", type: "LIMIT", quantity: 5, price: 100 });
    const lateOrder = await place(second.token, { symbol, side: "SELL", type: "LIMIT", quantity: 5, price: 100 });
    await place(buyer.token, { symbol, side: "BUY", type: "MARKET", quantity: 5 });

    const earlyStatus = (await api("GET", "/orders", first.token)).body.data.find(
      (o: { id: string }) => o.id === earlyOrder.body.data.id
    ).status;
    const lateStatus = (await api("GET", "/orders", second.token)).body.data.find(
      (o: { id: string }) => o.id === lateOrder.body.data.id
    ).status;

    assert.equal(earlyStatus, "FILLED");
    assert.equal(lateStatus, "PENDING");
  });
});