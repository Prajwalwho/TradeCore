import { CATALOG, type ExchangeCode } from "./catalog.js";

export type { ExchangeCode };

type Exchange = {
  code: ExchangeCode;
  name: string;
  timeZone: string;
  open: [number, number]; // local hour, minute
  close: [number, number];
};

export const EXCHANGES: Record<ExchangeCode, Exchange> = {
  NSE: { code: "NSE", name: "NSE", timeZone: "Asia/Kolkata", open: [9, 15], close: [15, 30] },
  US: { code: "US", name: "US", timeZone: "America/New_York", open: [9, 30], close: [16, 0] },
};

// Which exchange each symbol trades on, taken from the catalog.
export const SYMBOL_EXCHANGE: Record<string, ExchangeCode> = Object.fromEntries(
  CATALOG.map((c) => [c.symbol, c.exchange])
);

export function exchangeFor(symbol: string): ExchangeCode | null {
  return SYMBOL_EXCHANGE[symbol] ?? null;
}

export function isExchangeOpen(code: ExchangeCode, now = new Date()): boolean {
  const ex = EXCHANGES[code];
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ex.timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  if (weekday === "Sat" || weekday === "Sun") return false;

  const minutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return minutes >= ex.open[0] * 60 + ex.open[1] && minutes < ex.close[0] * 60 + ex.close[1];
}

export function allMarketStatuses(now = new Date()) {
  return (Object.keys(EXCHANGES) as ExchangeCode[]).map((code) => ({
    code,
    name: EXCHANGES[code].name,
    open: isExchangeOpen(code, now),
    symbols: Object.keys(SYMBOL_EXCHANGE).filter((s) => SYMBOL_EXCHANGE[s] === code),
  }));
}