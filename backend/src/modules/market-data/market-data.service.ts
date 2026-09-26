import { instrumentRepository } from "../instruments/instrument.repository.js";

type PricePoint = {
  symbol: string;
  price: number;
  updatedAt: string;
};

const prices = new Map<string, PricePoint>();

const STARTING_PRICES: Record<string, number> = {
  AAPL: 190.5,
  TSLA: 250.75,
  RELIANCE: 2950.0,
  TCS: 3850.0,
  INFY: 1550.0,
};

function randomWalk(price: number): number {
  const changePercent = (Math.random() - 0.5) * 0.02; // roughly ±1%
  const newPrice = price * (1 + changePercent);
  return Math.round(newPrice * 100) / 100;
}

export const marketDataService = {
  async initialize() {
    const instruments = await instrumentRepository.findAll();

    for (const instrument of instruments) {
      const startingPrice = STARTING_PRICES[instrument.symbol] ?? 100;
      prices.set(instrument.symbol, {
        symbol: instrument.symbol,
        price: startingPrice,
        updatedAt: new Date().toISOString(),
      });
    }
  },

  startGenerating() {
    setInterval(() => {
      for (const [symbol, point] of prices) {
        prices.set(symbol, {
          symbol,
          price: randomWalk(point.price),
          updatedAt: new Date().toISOString(),
        });
      }
    }, 2000);
  },

  getAllPrices(): PricePoint[] {
    return Array.from(prices.values());
  },

  getPrice(symbol: string): PricePoint | null {
    return prices.get(symbol) ?? null;
  },
};