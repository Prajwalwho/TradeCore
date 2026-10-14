import { instrumentRepository } from "../instruments/instrument.repository.js";
import { redisPublisher } from "../../redis/redis.client.js";
import { fxService } from "./fx.service.js";
import { currencyFor } from "../../config/currency.js";

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

// All prices stored here are in RUPEES. US stocks are converted from USD at the live rate.
const prices = new Map<string, PricePoint>();
const indices = new Map<string, IndexPoint>();

// Symbols whose price really came from Yahoo (not the 100 fallback).
const realPrice = new Set<string>();

// Small caches so many page loads don't each hit Yahoo.
const candleCache = new Map<string, { fetchedAt: number; candles: Candle[] }>();
const CANDLE_CACHE_MS = 30_000;
const statsCache = new Map<string, { fetchedAt: number; data: StockStats }>();
const STATS_CACHE_MS = 15_000;

// Maps our internal symbols to real Yahoo Finance tickers.
// US stocks use their plain ticker; NSE-listed Indian stocks need ".NS".
const YAHOO_TICKERS: Record<string, string> = {
  AAPL: "AAPL",
  TSLA: "TSLA",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  INFY: "INFY.NS",
};

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

function convertQuote(symbol: string, quote: YahooQuote | null): YahooQuote | null {
  if (!quote) return null;
  const rate = rateFor(symbol);
  if (rate === null) return null; // never publish a USD price as if it were rupees
  return {
    price: toRupees(quote.price, rate),
    previousClose: quote.previousClose === null ? null : toRupees(quote.previousClose, rate),
  };
}

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

      candles.push({
        time: timestamps[i] as number,
        open,
        high,
        low,
        close,
      });
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

export const marketDataService = {
  async initialize() {
    await fxService.refresh();

    const instruments = await instrumentRepository.findAll();
    for (const instrument of instruments) {
      const yahooSymbol = YAHOO_TICKERS[instrument.symbol];
      const quote = yahooSymbol
        ? convertQuote(instrument.symbol, await fetchYahooQuote(yahooSymbol))
        : null;
      prices.set(instrument.symbol, {
        symbol: instrument.symbol,
        price: quote?.price ?? 100, // placeholder only; not marked as a real price
        previousClose: quote?.previousClose ?? null,
        updatedAt: new Date().toISOString(),
      });
      if (quote) realPrice.add(instrument.symbol);
    }
    await refreshIndices();
  },

  startGenerating() {
    setInterval(async () => {
      await fxService.refresh();

      for (const [symbol] of prices) {
        const yahooSymbol = YAHOO_TICKERS[symbol];
        if (!yahooSymbol) continue;

        const quote = convertQuote(symbol, await fetchYahooQuote(yahooSymbol));
        if (quote) {
          realPrice.add(symbol);
          prices.set(symbol, {
            symbol,
            price: quote.price,
            previousClose: quote.previousClose,
            updatedAt: new Date().toISOString(),
          });
        }
        // if the fetch fails (network hiccup, market closed), we keep the last known price
      }

      await refreshIndices();

      const snapshot = this.getAllPrices();
      redisPublisher.publish(
        MARKET_DATA_CHANNEL,
        JSON.stringify({ type: "price_update", prices: snapshot })
      );
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