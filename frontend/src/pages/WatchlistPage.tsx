import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useLivePrices } from "../hooks/useLivePrices";
import { ApiError } from "../lib/api-client";
import {
  fetchWatchlist,
  fetchInstruments,
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
  type InstrumentItem,
} from "../lib/watchlist-api";
import "./WatchlistPage.css";

function changeInfo(price: number | undefined, prev: number | null | undefined) {
  if (price === undefined || !prev) return null;
  const change = price - prev;
  return { change, pct: (change / prev) * 100 };
}

export function WatchlistPage() {
  const navigate = useNavigate();
  const prices = useLivePrices();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [instruments, setInstruments] = useState<InstrumentItem[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchlist()
      .then(setWatchlist)
      .catch(() => setError("Could not load watchlist"));
    fetchInstruments()
      .then(setInstruments)
      .catch(() => {});
  }, []);

  const inList = useMemo(() => new Set(watchlist.map((w) => w.symbol)), [watchlist]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return instruments.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    );
  }, [query, instruments]);

  async function handleAdd(symbol: string) {
    setBusy(symbol);
    setError(null);
    try {
      setWatchlist(await addToWatchlist(symbol));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(symbol: string) {
    setBusy(symbol);
    setError(null);
    try {
      setWatchlist(await removeFromWatchlist(symbol));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Layout>
      <h1>Watchlist</h1>

      <div className="wl-search">
        <input
          type="text"
          placeholder="Search stocks to add (e.g. reliance, TCS)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="wl-results">
            {results.length === 0 ? (
              <p className="wl-empty">No matching instruments</p>
            ) : (
              results.map((i) => (
                <div key={i.symbol} className="wl-result">
                  <div>
                    <strong>{i.symbol}</strong>
                    <span className="wl-name">{i.name}</span>
                  </div>
                  {inList.has(i.symbol) ? (
                    <span className="wl-added">Added</span>
                  ) : (
                    <button className="wl-btn" disabled={busy === i.symbol} onClick={() => handleAdd(i.symbol)}>
                      {busy === i.symbol ? "..." : "+ Add"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="wl-error">{error}</p>}

      {watchlist.length === 0 ? (
        <p className="wl-empty">Your watchlist is empty. Search above to add stocks.</p>
      ) : (
        <table className="wl-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th className="num">Price</th>
              <th className="num">Change</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((w) => {
              const live = prices[w.symbol];
              const info = changeInfo(live?.price, live?.previousClose);
              const dir = info === null ? "" : info.change >= 0 ? "up" : "down";
              return (
                <tr key={w.symbol} onClick={() => navigate(`/trade/${w.symbol}`)}>
                  <td className="symbol">{w.symbol}</td>
                  <td>{w.name}</td>
                  <td className="num">{live ? live.price.toFixed(2) : "—"}</td>
                  <td className={`num change ${dir}`}>
                    {info
                      ? `${info.change >= 0 ? "▲" : "▼"} ${Math.abs(info.change).toFixed(2)} (${Math.abs(info.pct).toFixed(2)}%)`
                      : "—"}
                  </td>
                  <td className="num">
                    <button
                      className="wl-btn remove"
                      disabled={busy === w.symbol}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(w.symbol);
                      }}
                    >
                      {busy === w.symbol ? "..." : "Remove"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Layout>
  );
}