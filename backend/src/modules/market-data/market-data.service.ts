import { instrumentRepository } from "../instruments/instrument.repository.js";
import { redisPublisher } from "../../redis/redis.client.js";
import { fxService } from "./fx.service.js";
import { currencyFor } from "../../config/currency.js";
import { CATALOG } from "../../config/catalog.js";
import { exchangeFor, isExchangeOpen } from "../../config/exchanges.js";

export type PricePoint = {
  symbol: string;
  price: number;
  previousClose: number | null;
  updatedAt: string;
};

export type IndexPoint = {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  updatedAt: string;
};

export type Candle = {
  time: number; // unix seconds, UTC
  open: number;
  high: number;
  low: number;
  close: number;
};

export type StockStats = {
  symbol: string;
  last: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
};

type YahooQuote = {
  price: number;
  previousClose: number | null;
};

export const MARKET_DATA_CHANNEL = "market-data:ticks";

// Rupee prices, only for symbols that really got a quote. A symbol without a price shows "—".
const prices = new Map<string, PricePoint>();
// The latest quote in each stock's own currency (USD for US stocks).
const nativeQuotes = new Map<string, YahooQuote>();
const indices = new Map<string, IndexPoint>();

// Symbols whose price really came from Yahoo.
const realPrice = new Set<string>();

// Stocks someone looked at recently are refreshed on every cycle.
const hot = new Map<string, number>();
const HOT_MS = 2 * 60_000;
const BATCH = 10; // how many other stocks to refresh per 15s cycle
let cursor = 0;
let symbols: string[] = [];

// Small caches so many page loads don't each hit Yahoo.
const candleCache = new Map<string, { fetchedAt: number; candles: Candle[] }>();
const CANDLE_CACHE_MS = 30_000;
const statsCache = new Map<string, { fetchedAt: number; data: StockStats }>();
const STATS_CACHE_MS = 15_000;

// Our symbol -> Yahoo ticker, from the catalog.
const YAHOO_TICKERS: Record<string, string> = Object.fromEntries(
  CATALOG.map((c) => [c.symbol, c.yahoo])
);

// Market indices shown in the top ticker (display only, not tradable).
const INDEX_TICKERS: Record<string, { yahoo: string; name: string }> = {
  NIFTY: { yahoo: "^NSEI", name: "NIFTY 50" },
  BANKNIFTY: { yahoo: "^NSEBANK", name: "BANK NIFTY" },
};

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const numbersOnly = (arr: unknown): number[] =>
  Array.isArray(arr) ? arr.filter((v): v is number => typeof v === "number") : [];

// Multiplier that turns a symbol's native price into rupees, or null if the rate is not known yet.
function rateFor(symbol: string): number | null {
  return currencyFor(symbol) === "USD" ? fxService.getUsdInr() : 1;
}

const toRupees = (value: number, rate: number) => Math.round(value * rate * 100) / 100;

function chartUrl(yahooSymbol: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
}

async function fetchYahooQuote(yahooSymbol: string): Promise<YahooQuote | null> {
  try {
    const res = await fetch(chartUrl(yahooSymbol), { headers: YAHOO_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    if (typeof price !== "number") return null;

    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    return { price, previousClose: typeof prev === "number" ? prev : null };
  } catch {
    return null;
  }
}

async function fetchYahooCandles(yahooSymbol: string): Promise<Candle[] | null> {
  try {
    const res = await fetch(chartUrl(yahooSymbol), { headers: YAHOO_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps: number[] | undefined = result?.timestamp;
    const quote = result?.indicators?.quote?.[0];
    if (!timestamps || !quote) return null;

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const close = quote.close?.[i];

      // Yahoo leaves null gaps for minutes with no trades; skip those.
      if (
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number"
      ) {
        continue;
      }

      candles.push({ time: timestamps[i] as number, open, high, low, close });
    }
    return candles;
  } catch {
    return null;
  }
}

async function fetchYahooStats(
  symbol: string,
  yahooSymbol: string,
  rate: number
): Promise<StockStats | null> {
  try {
    const res = await fetch(chartUrl(yahooSymbol), { headers: YAHOO_HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    const quote = result?.indicators?.quote?.[0];
    const opens = numbersOnly(quote?.open);
    const highs = numbersOnly(quote?.high);
    const lows = numbersOnly(quote?.low);
    const volumes = numbersOnly(quote?.volume);

    const conv = (v: number | null): number | null => (v === null ? null : toRupees(v, rate));

    const nativeLast = num(meta.regularMarketPrice);
    const last = prices.get(symbol)?.price ?? (nativeLast === null ? null : toRupees(nativeLast, rate));
    if (last === null) return null;

    const previousClose = conv(num(meta.chartPreviousClose) ?? num(meta.previousClose));
    const change = previousClose ? last - previousClose : null;

    return {
      symbol,
      last,
      open: conv(opens[0] ?? null),
      high: conv(num(meta.regularMarketDayHigh) ?? (highs.length ? Math.max(...highs) : null)),
      low: conv(num(meta.regularMarketDayLow) ?? (lows.length ? Math.min(...lows) : null)),
      previousClose,
      change,
      changePct: change !== null && previousClose ? (change / previousClose) * 100 : null,
      volume: num(meta.regularMarketVolume) ?? (volumes.length ? volumes.reduce((a, b) => a + b, 0) : null),
      fiftyTwoWeekHigh: conv(num(meta.fiftyTwoWeekHigh)),
      fiftyTwoWeekLow: conv(num(meta.fiftyTwoWeekLow)),
    };
  } catch {
    return null;
  }
}

async function refreshIndices(): Promise<void> {
  for (const [symbol, info] of Object.entries(INDEX_TICKERS)) {
    const quote = await fetchYahooQuote(info.yahoo);
    if (quote) {
      indices.set(symbol, {
        symbol,
        name: info.name,
        price: quote.price,
        previousClose: quote.previousClose,
        updatedAt: new Date().toISOString(),
      });
    }
    // on failure we keep the last known value
  }
}

async function fetchAndStore(symbol: string): Promise<void> {
  const yahoo = YAHOO_TICKERS[symbol];
  if (!yahoo) return;
  const quote = await fetchYahooQuote(yahoo);
  if (quote) nativeQuotes.set(symbol, quote);
}

// Turns the stored native quote into a rupee price at the current exchange rate.
function applyQuote(symbol: string): void {
  const quote = nativeQuotes.get(symbol);
  const rate = rateFor(symbol);
  if (!quote || rate === null) return;

  prices.set(symbol, {
    symbol,
    price: toRupees(quote.price, rate),
    previousClose: quote.previousClose === null ? null : toRupees(quote.previousClose, rate),
    updatedAt: new Date().toISOString(),
  });
  realPrice.add(symbol);
}

async function inChunks<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

// Which stocks to fetch from Yahoo this cycle. Closed exchanges are not polled again.
function pickDue(): string[] {
  const now = Date.now();
  const due = new Set<string>();
  const missing: string[] = [];
  const openCold: string[] = [];

  for (const symbol of symbols) {
    if (!nativeQuotes.has(symbol)) {
      missing.push(symbol);
      continue;
    }
    const exchange = exchangeFor(symbol);
    if (!exchange || !isExchangeOpen(exchange)) continue;

    if ((hot.get(symbol) ?? 0) > now - HOT_MS) due.add(symbol);
    else openCold.push(symbol);
  }

  for (const symbol of missing.slice(0, BATCH)) due.add(symbol);

  const take = Math.min(BATCH, openCold.length);
  for (let i = 0; i < take; i++) {
    due.add(openCold[(cursor + i) % openCold.length] as string);
  }
  cursor = openCold.length > 0 ? (cursor + take) % openCold.length : 0;

  return [...due];
}

async function refreshCycle(): Promise<void> {
  await fxService.refresh();
  await inChunks(pickDue(), 5, fetchAndStore);
  // Re-convert everything, so US stocks follow the dollar rate even while their market is closed.
  for (const symbol of nativeQuotes.keys()) applyQuote(symbol);
  await refreshIndices();
}

let cycleRunning = false;

export const marketDataService = {
  async initialize() {
    await fxService.refresh();

    const rows = await instrumentRepository.findAll();
    symbols = rows.map((r) => r.symbol).filter((s) => YAHOO_TICKERS[s]);

    await inChunks(symbols, 5, fetchAndStore);
    for (const symbol of symbols) applyQuote(symbol);
    await refreshIndices();

    const missing = symbols.filter((s) => !prices.has(s));
    if (missing.length > 0) {
      console.warn(`[market-data] no price yet for: ${missing.join(", ")}`);
    }
  },

  startGenerating() {
    setInterval(async () => {
      if (cycleRunning) return;
      cycleRunning = true;
      try {
        await refreshCycle();
        redisPublisher.publish(
          MARKET_DATA_CHANNEL,
          JSON.stringify({ type: "price_update", prices: this.getAllPrices() })
        );
      } catch (err) {
        console.error("[market-data] refresh failed", err);
      } finally {
        cycleRunning = false;
      }
    }, 15000);
  },

  getAllPrices(): PricePoint[] {
    return Array.from(prices.values());
  },

  getPrice(symbol: string): PricePoint | null {
    return prices.get(symbol) ?? null;
  },

  hasRealPrice(symbol: string): boolean {
    return realPrice.has(symbol);
  },

  getIndices(): IndexPoint[] {
    return Array.from(indices.values());
  },

  // Real 1-minute candles for the most recent trading session, in rupees.
  async getCandles(symbol: string): Promise<Candle[] | null> {
    const yahooSymbol = YAHOO_TICKERS[symbol];
    if (!yahooSymbol) return null;
    hot.set(symbol, Date.now());

    const cached = candleCache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CANDLE_CACHE_MS) {
      return cached.candles;
    }

    const rate = rateFor(symbol);
    const raw = rate === null ? null : await fetchYahooCandles(yahooSymbol);
    if (raw && raw.length > 0 && rate !== null) {
      // The whole session is converted at the current rate so the chart lines up with the live price.
      const candles = raw.map((c) => ({
        time: c.time,
        open: toRupees(c.open, rate),
        high: toRupees(c.high, rate),
        low: toRupees(c.low, rate),
        close: toRupees(c.close, rate),
      }));
      candleCache.set(symbol, { fetchedAt: Date.now(), candles });
      return candles;
    }

    return cached?.candles ?? null; // fall back to stale data rather than nothing
  },

  // Open / high / low / volume etc. for the stock detail panel, in rupees.
  async getStats(symbol: string): Promise<StockStats | null> {
    const yahooSymbol = YAHOO_TICKERS[symbol];
    if (!yahooSymbol) return null;
    hot.set(symbol, Date.now());

    const cached = statsCache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < STATS_CACHE_MS) {
      return cached.data;
    }

    const rate = rateFor(symbol);
    if (rate === null) return cached?.data ?? null;

    const data = await fetchYahooStats(symbol, yahooSymbol, rate);
    if (data) {
      statsCache.set(symbol, { fetchedAt: Date.now(), data });
      return data;
    }

    return cached?.data ?? null;
  },
};