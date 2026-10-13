import { config } from "../../config/env.js";
import { userRepository } from "../users/user.repository.js";
import { accountRepository } from "../accounts/account.repository.js";
import { orderRepository } from "../orders/order.repository.js";
import { orderService } from "../orders/order.service.js";
import { marketDataService } from "../market-data/market-data.service.js";
import { priceToCents } from "../../utils/money.js";

export const MM_EMAIL = "market-maker@paper.local";

const LEVELS_BPS = [10, 20, 30]; // distance from the live price, in basis points (0.01%)
const SIZE_PER_LEVEL = 2000;
const REQUOTE_THRESHOLD_BPS = 5; // re-quote when the price moves at least 0.05%
const INTERVAL_MS = 15_000;

let mm: { userId: string; accountId: string } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
const lastQuotedMid = new Map<string, number>(); // symbol -> mid price in cents

function buildQuotes(symbol: string, midCents: number) {
  const quotes: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "LIMIT";
    quantity: number;
    price: number;
  }[] = [];
  for (const bps of LEVELS_BPS) {
    const offset = Math.max(1, Math.round((midCents * bps) / 10_000));
    const bid = midCents - offset;
    const ask = midCents + offset;
    if (bid < 1) continue;
    quotes.push({ symbol, side: "SELL", type: "LIMIT", quantity: SIZE_PER_LEVEL, price: ask / 100 });
    quotes.push({ symbol, side: "BUY", type: "LIMIT", quantity: SIZE_PER_LEVEL, price: bid / 100 });
  }
  return quotes;
}

async function tick() {
  if (!mm || running) return;
  running = true;
  try {
    const open = await orderRepository.findOpenByAccountId(mm.accountId);
    const idsBySymbol = new Map<string, string[]>();
    for (const { order, symbol } of open) {
      const list = idsBySymbol.get(symbol) ?? [];
      list.push(order.id);
      idsBySymbol.set(symbol, list);
    }

    for (const point of marketDataService.getAllPrices()) {
      const symbol = point.symbol;
      if (!marketDataService.hasRealPrice(symbol)) continue;

      const midCents = priceToCents(point.price);
      const ids = idsBySymbol.get(symbol) ?? [];
      const last = lastQuotedMid.get(symbol);

      const moved =
        last === undefined || Math.abs(midCents - last) * 10_000 >= last * REQUOTE_THRESHOLD_BPS;
      const depleted = ids.length < LEVELS_BPS.length * 2;
      if (!moved && !depleted) continue;

      await orderService.replaceOrders(mm.userId, ids, buildQuotes(symbol, midCents));
      lastQuotedMid.set(symbol, midCents);
      console.log(`[mm] quoted ${symbol} around ${(midCents / 100).toFixed(2)}`);
    }
  } catch (err) {
    console.error("[mm] tick failed", err);
  } finally {
    running = false;
  }
}

export const marketMakerService = {
  async start() {
    if (!config.marketMaker.enabled) {
      console.log("[mm] disabled (set MARKET_MAKER_ENABLED=true to turn on)");
      return;
    }
    const user = await userRepository.findByEmail(MM_EMAIL);
    const account = user ? await accountRepository.findByUserId(user.id) : null;
    if (!user || !account) {
      console.warn("[mm] account not found; run scripts/seed-market-maker.ts. Liquidity is OFF.");
      return;
    }
    mm = { userId: user.id, accountId: account.id };
    console.log("[mm] market maker started");
    await tick();
    timer = setInterval(() => void tick(), INTERVAL_MS);
  },

  stop() {
    if (timer) clearInterval(timer);
    timer = null;
  },
};