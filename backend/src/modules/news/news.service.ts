export type NewsItem = {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
};

// Search queries per symbol. "ALL" is general market news.
const NEWS_QUERIES: Record<string, string> = {
  ALL: "Sensex Nifty",
  AAPL: "AAPL",
  TSLA: "TSLA",
  RELIANCE: "RELIANCE.NS",
  TCS: "TCS.NS",
  INFY: "INFY.NS",
};

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

const cache = new Map<string, { fetchedAt: number; items: NewsItem[] }>();
const CACHE_MS = 5 * 60_000;

async function fetchNews(query: string): Promise<NewsItem[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=15&quotesCount=0`,
      { headers: YAHOO_HEADERS }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const raw: unknown[] = Array.isArray(data?.news) ? data.news : [];
    const items: NewsItem[] = [];

    for (const entry of raw) {
      const n = entry as {
        uuid?: unknown;
        title?: unknown;
        publisher?: unknown;
        link?: unknown;
        providerPublishTime?: unknown;
      };
      if (typeof n.title !== "string" || typeof n.link !== "string") continue;
      if (!n.link.startsWith("https://") && !n.link.startsWith("http://")) continue;

      items.push({
        id: typeof n.uuid === "string" ? n.uuid : n.link,
        title: n.title,
        publisher: typeof n.publisher === "string" ? n.publisher : "",
        link: n.link,
        publishedAt:
          typeof n.providerPublishTime === "number"
            ? new Date(n.providerPublishTime * 1000).toISOString()
            : new Date().toISOString(),
      });
    }

    items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return items.slice(0, 20);
  } catch {
    return null;
  }
}

export const newsService = {
  async get(symbol: string): Promise<NewsItem[]> {
    const key = NEWS_QUERIES[symbol] ? symbol : "ALL";
    const query = NEWS_QUERIES[key] as string;

    const cached = cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      return cached.items;
    }

    const items = await fetchNews(query);
    if (items) {
      cache.set(key, { fetchedAt: Date.now(), items });
      return items;
    }
    return cached?.items ?? [];
  },
};