export type ExchangeCode = "NSE" | "US";

export type CatalogItem = {
  symbol: string;
  name: string;
  sector: string;
  yahoo: string; // Yahoo Finance ticker
  exchange: ExchangeCode;
};

const nse = (symbol: string, name: string, sector: string): CatalogItem => ({
  symbol,
  name,
  sector,
  yahoo: `${symbol}.NS`,
  exchange: "NSE",
});

const us = (symbol: string, name: string, sector: string): CatalogItem => ({
  symbol,
  name,
  sector,
  yahoo: symbol,
  exchange: "US",
});

// The single list of tradable instruments. Add a line here, then run the seed scripts.
export const CATALOG: CatalogItem[] = [
  nse("HDFCBANK", "HDFC Bank Ltd.", "Banks & Finance"),
  nse("ICICIBANK", "ICICI Bank Ltd.", "Banks & Finance"),
  nse("SBIN", "State Bank of India", "Banks & Finance"),
  nse("KOTAKBANK", "Kotak Mahindra Bank Ltd.", "Banks & Finance"),
  nse("AXISBANK", "Axis Bank Ltd.", "Banks & Finance"),
  nse("BAJFINANCE", "Bajaj Finance Ltd.", "Banks & Finance"),

  nse("TCS", "Tata Consultancy Services Ltd.", "IT Services"),
  nse("INFY", "Infosys Ltd.", "IT Services"),
  nse("WIPRO", "Wipro Ltd.", "IT Services"),
  nse("HCLTECH", "HCL Technologies Ltd.", "IT Services"),
  nse("TECHM", "Tech Mahindra Ltd.", "IT Services"),

  nse("RELIANCE", "Reliance Industries Ltd.", "Energy & Power"),
  nse("ONGC", "Oil & Natural Gas Corporation Ltd.", "Energy & Power"),
  nse("NTPC", "NTPC Ltd.", "Energy & Power"),
  nse("POWERGRID", "Power Grid Corporation of India Ltd.", "Energy & Power"),

  nse("ITC", "ITC Ltd.", "Consumer & Healthcare"),
  nse("HINDUNILVR", "Hindustan Unilever Ltd.", "Consumer & Healthcare"),
  nse("TITAN", "Titan Company Ltd.", "Consumer & Healthcare"),
  nse("ASIANPAINT", "Asian Paints Ltd.", "Consumer & Healthcare"),
  nse("NESTLEIND", "Nestle India Ltd.", "Consumer & Healthcare"),
  nse("SUNPHARMA", "Sun Pharmaceutical Industries Ltd.", "Consumer & Healthcare"),

  nse("MARUTI", "Maruti Suzuki India Ltd.", "Auto"),
  nse("HEROMOTOCO", "Hero MotoCorp Ltd.", "Auto"),
  nse("EICHERMOT", "Eicher Motors Ltd.", "Auto"),

  nse("TATASTEEL", "Tata Steel Ltd.", "Materials"),
  nse("JSWSTEEL", "JSW Steel Ltd.", "Materials"),
  nse("COALINDIA", "Coal India Ltd.", "Materials"),
  nse("ULTRACEMCO", "UltraTech Cement Ltd.", "Materials"),

  nse("LT", "Larsen & Toubro Ltd.", "Industrials & Telecom"),
  nse("ADANIENT", "Adani Enterprises Ltd.", "Industrials & Telecom"),
  nse("BHARTIARTL", "Bharti Airtel Ltd.", "Industrials & Telecom"),

  us("AAPL", "Apple Inc.", "US Tech"),
  us("MSFT", "Microsoft Corporation", "US Tech"),
  us("NVDA", "NVIDIA Corporation", "US Tech"),
  us("AMD", "Advanced Micro Devices, Inc.", "US Tech"),

  us("GOOGL", "Alphabet Inc.", "US Media & Internet"),
  us("META", "Meta Platforms, Inc.", "US Media & Internet"),
  us("NFLX", "Netflix, Inc.", "US Media & Internet"),
  us("DIS", "The Walt Disney Company", "US Media & Internet"),

  us("TSLA", "Tesla, Inc.", "US Consumer"),
  us("AMZN", "Amazon.com, Inc.", "US Consumer"),
  us("KO", "The Coca-Cola Company", "US Consumer"),
  us("WMT", "Walmart Inc.", "US Consumer"),

  us("JPM", "JPMorgan Chase & Co.", "US Financials"),
  us("V", "Visa Inc.", "US Financials"),
];
