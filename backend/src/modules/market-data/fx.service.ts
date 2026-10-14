const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

let usdInr: number | null = null;
let updatedAt: string | null = null;

async function fetchRate(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent("INR=X")}?interval=1m&range=1d`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    // Sanity range: refuse garbage so a bad response can never reprice every US stock.
    if (typeof rate !== "number" || rate < 20 || rate > 500) return null;
    return rate;
  } catch {
    return null;
  }
}

export const fxService = {
  async refresh() {
    const rate = await fetchRate();
    if (rate !== null) {
      usdInr = rate;
      updatedAt = new Date().toISOString();
    }
    // on failure we keep the last known rate
  },

  getUsdInr(): number | null {
    return usdInr;
  },

  getInfo() {
    return { usdInr, updatedAt };
  },
};