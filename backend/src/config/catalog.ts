export type ExchangeCode = "NSE" | "US";

export type CatalogItem = {
  symbol: string;
  name: string;
  yahoo: string; // Yahoo Finance ticker
  exchange: ExchangeCode;
};

const nse = (symbol: string, name: string): CatalogItem => ({
  symbol,
  name,
  yahoo: `${symbol}.NS`,
  exchange: "NSE",
});

const us = (symbol: string, name: string): CatalogItem => ({
  symbol,
  name,
  yahoo: symbol,
  exchange: "US",
});

// The single list of tradable instruments. Add a line here, then run the seed scripts.
export const CATALOG: CatalogItem[] = [
  nse("RELIANCE", "Reliance Industries Ltd."),
  nse("TCS", "Tata Consultancy Services Ltd."),
  nse("INFY", "Infosys Ltd."),
  nse("HDFCBANK", "HDFC Bank Ltd."),
  nse("ICICIBANK", "ICICI Bank Ltd."),
  nse("SBIN", "State Bank of India"),
  nse("BHARTIARTL", "Bharti Airtel Ltd."),
  nse("ITC", "ITC Ltd."),
  nse("LT", "Larsen & Toubro Ltd."),
  nse("KOTAKBANK", "Kotak Mahindra Bank Ltd."),
  nse("AXISBANK", "Axis Bank Ltd."),
  nse("HINDUNILVR", "Hindustan Unilever Ltd."),
  nse("MARUTI", "Maruti Suzuki India Ltd."),
  nse("SUNPHARMA", "Sun Pharmaceutical Industries Ltd."),
  nse("TITAN", "Titan Company Ltd."),
  nse("ASIANPAINT", "Asian Paints Ltd."),
  nse("WIPRO", "Wipro Ltd."),
  nse("HCLTECH", "HCL Technologies Ltd."),
  nse("ULTRACEMCO", "UltraTech Cement Ltd."),
  nse("NESTLEIND", "Nestle India Ltd."),
  nse("BAJFINANCE", "Bajaj Finance Ltd."),
  nse("ONGC", "Oil & Natural Gas Corporation Ltd."),
  nse("NTPC", "NTPC Ltd."),
  nse("POWERGRID", "Power Grid Corporation of India Ltd."),
  nse("COALINDIA", "Coal India Ltd."),
  nse("TATASTEEL", "Tata Steel Ltd."),
  nse("JSWSTEEL", "JSW Steel Ltd."),
  nse("ADANIENT", "Adani Enterprises Ltd."),
  nse("HEROMOTOCO", "Hero MotoCorp Ltd."),
  nse("EICHERMOT", "Eicher Motors Ltd."),
  nse("TECHM", "Tech Mahindra Ltd."),

  us("AAPL", "Apple Inc."),
  us("TSLA", "Tesla, Inc."),
  us("MSFT", "Microsoft Corporation"),
  us("GOOGL", "Alphabet Inc."),
  us("AMZN", "Amazon.com, Inc."),
  us("NVDA", "NVIDIA Corporation"),
  us("META", "Meta Platforms, Inc."),
  us("NFLX", "Netflix, Inc."),
  us("AMD", "Advanced Micro Devices, Inc."),
  us("JPM", "JPMorgan Chase & Co."),
  us("V", "Visa Inc."),
  us("DIS", "The Walt Disney Company"),
  us("KO", "The Coca-Cola Company"),
  us("WMT", "Walmart Inc."),
];