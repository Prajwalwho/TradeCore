import { instrumentRepository } from "../instruments/instrument.repository.js";
import { redisPublisher } from "../../redis/redis.client.js";

export type PricePoint = {
  symbol: string;
  price: number;
  updatedAt: string;
};

export type Candle = {
  time: number; // unix seconds, UTC
  open: number;
  high: number;
  low: number;
  close: number;
};

export const MARKET_DATA_CHANNEL = "market-data:ticks";

const prices = new Map<string, PricePoint>();

// Small cache so many page loads don't each hit Yahoo.
const candleCache = new Map<string, { fetchedAt: number; candles: Candle[] }>();
const CANDLE_CACHE_MS = 30_000;

// Maps our internal symbols to real Yahoo Finance tickers.
// US stocks use their plain ticker; NSE-listed Indian stocks need ".NS".
const YAHOO_TICKERS: Record<string, string> = {
  AAPL: "AAPL",
  TSLA: "TSLA",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  INFY: "INFY.NS",
};

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

async function fetchYahooPrice(yahooSymbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

async function fetchYahooCandles(yahooSymbol: string): Promise<Candle[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      { headers: YAHOO_HEADERS }
    );
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
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
      });
    }
    return candles;
  } catch {
    return null;
  }
}

export const marketDataService = {
  async initialize() {
    const instruments = await instrumentRepository.findAll();
    for (const instrument of instruments) {
      const yahooSymbol = YAHOO_TICKERS[instrument.symbol];
      const livePrice = yahooSymbol ? await fetchYahooPrice(yahooSymbol) : null;
      prices.set(instrument.symbol, {
        symbol: instrument.symbol,
        price: livePrice ?? 100, // fallback only if Yahoo is unreachable right at boot
        updatedAt: new Date().toISOString(),
      });
    }
  },

  startGenerating() {
    setInterval(async () => {
      for (const [symbol] of prices) {
        const yahooSymbol = YAHOO_TICKERS[symbol];
        if (!yahooSymbol) continue;
        const livePrice = await fetchYahooPrice(yahooSymbol);
        if (livePrice !== null) {
          prices.set(symbol, { symbol, price: livePrice, updatedAt: new Date().toISOString() });
        }
        // if the fetch fails (network hiccup, market closed), we keep the last known price
      }

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

  // Real 1-minute candles for the most recent trading session.
  async getCandles(symbol: string): Promise<Candle[] | null> {
    const yahooSymbol = YAHOO_TICKERS[symbol];
    if (!yahooSymbol) return null;

    const cached = candleCache.get(symbol);
    if (cached && Date.now() - cached.fetchedAt < CANDLE_CACHE_MS) {
      return cached.candles;
    }

    const candles = await fetchYahooCandles(yahooSymbol);
    if (candles && candles.length > 0) {
      candleCache.set(symbol, { fetchedAt: Date.now(), candles });
      return candles;
    }

    return cached?.candles ?? null; // fall back to stale data rather than nothing
  },
};