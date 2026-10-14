import { instrumentRepository } from "../instruments/instrument.repository.js";
import { watchlistRepository } from "./watchlist.repository.js";
import { AppError } from "../../utils/app-error.js";

const MAX_ITEMS = 20;

export const watchlistService = {
  list(userId: string) {
    return watchlistRepository.list(userId);
  },

  async add(userId: string, symbol: string) {
    const instrument = await instrumentRepository.findBySymbol(symbol.toUpperCase());
    if (!instrument) throw new AppError(`Unknown instrument: ${symbol}`, 404);

    const current = await watchlistRepository.list(userId);
    if (current.length >= MAX_ITEMS && !current.some((c) => c.symbol === instrument.symbol)) {
      throw new AppError(`Watchlist is full (max ${MAX_ITEMS})`, 422);
    }

    await watchlistRepository.add(userId, instrument.id);
    return watchlistRepository.list(userId);
  },

  async remove(userId: string, symbol: string) {
    const instrument = await instrumentRepository.findBySymbol(symbol.toUpperCase());
    if (!instrument) throw new AppError(`Unknown instrument: ${symbol}`, 404);

    await watchlistRepository.remove(userId, instrument.id);
    return watchlistRepository.list(userId);
  },
};