import { instrumentRepository } from "../instruments/instrument.repository.js";
import { redisPublisher } from "../../redis/redis.client.js";

export type PricePoint = {
  symbol: string;
  price: number;
  updatedAt: string;
};

export const MARKET_DATA_CHANNEL = "market-data:ticks";

const prices = new Map<string, PricePoint>();

// Maps our internal symbols to real Yahoo Finance tickers.
// US stocks use their plain ticker; NSE-listed Indian stocks need ".NS".
const YAHOO_TICKERS: Record<string, string> = {
  AAPL: "AAPL",
  TSLA: "TSLA",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  INFY: "INFY.NS",
};

async function fetchYahooPrice(yahooSymbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
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
        // if the fetch fails (network hiccup, market closed), we just keep the last known price
      }

      const snapshot = this.getAllPrices();
      redisPublisher.publish(
        MARKET_DATA_CHANNEL,
        JSON.stringify({ type: "price_update", prices: snapshot })
      );
    }, 15000); // real quotes don't need 2s granularity, and this avoids hammering Yahoo
  },

  getAllPrices(): PricePoint[] {
    return Array.from(prices.values());
  },

  getPrice(symbol: string): PricePoint | null {
    return prices.get(symbol) ?? null;
  },
};