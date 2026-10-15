import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { PriceCell } from "../components/PriceCell";
import { useLivePrices } from "../hooks/useLivePrices";
import { ApiError } from "../lib/api-client";
import { avatarColor, initials } from "../lib/avatar";
import {
  fetchWatchlist,
  fetchInstruments,
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
  type InstrumentItem,
} from "../lib/watchlist-api";

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
      .catch(() => setError("Could not load your watchlist. Refresh the page to try again."));
    fetchInstruments()
      .then(setInstruments)
      .catch(() => {});
  }, []);

  const inList = useMemo(() => new Set(watchlist.map((w) => w.symbol)), [watchlist]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return instruments
      .filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, instruments]);

  const suggestions = useMemo(
    () => instruments.filter((i) => !inList.has(i.symbol)).slice(0, 8),
    [instruments, inList]
  );

  async function handleAdd(symbol: string) {
    setBusy(symbol);
    setError(null);
    try {
      setWatchlist(await addToWatchlist(symbol));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this stock. Try again.");
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
      setError(err instanceof ApiError ? err.message : "Could not remove this stock. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Layout>
      <div className="page-head">
        <h1>Watchlist</h1>
        <span className="count">{watchlist.length} of 20</span>
      </div>

      <div className="search">
        <input
          type="text"
          placeholder="Search stocks, for example reliance or TCS"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="card search-results">
            {results.length === 0 ? (
              <p className="wl-empty" style={{ padding: "0.8rem 1rem", margin: 0 }}>
                No stock matches "{query.trim()}".
              </p>
            ) : (
              results.map((i) => (
                <div key={i.symbol} className="search-item">
                  <span className="avatar sm" style={{ background: avatarColor(i.symbol) }}>
                    {initials(i.symbol)}
                  </span>
                  <div className="grow">
                    <strong>{i.symbol}</strong>
                    <div className="sub">{i.name}</div>
                  </div>
                  {inList.has(i.symbol) ? (
                    <span className="added">Added</span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" disabled={busy === i.symbol} onClick={() => handleAdd(i.symbol)}>
                      {busy === i.symbol ? "Adding..." : "Add"}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {watchlist.length === 0 ? (
        <div className="card empty-state">
          <h3>Start your watchlist</h3>
          <p>Add a few stocks to follow their prices in one place.</p>
          <div className="chips">
            {suggestions.map((i) => (
              <button key={i.symbol} className="chip" disabled={busy === i.symbol} onClick={() => handleAdd(i.symbol)}>
                + {i.symbol}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="card wl-list">
          {watchlist.map((w) => {
            const live = prices[w.symbol];
            const info = changeInfo(live?.price, live?.previousClose);
            return (
              <div key={w.symbol} className={`wl-row ${info ? (info.change >= 0 ? "bull" : "bear") : ""}`} onClick={() => navigate(`/trade/${w.symbol}`)}>
                <span className="avatar" style={{ background: avatarColor(w.symbol) }}>
                  {initials(w.symbol)}
                </span>
                <div className="wl-main">
                  <div className="wl-sym">{w.symbol}</div>
                  <div className="wl-name">{w.name}</div>
                </div>
                <div className="wl-right">
                  <PriceCell prefix="₹" value={live?.price} />
                  {info && (
                    <span className={`pill ${info.change >= 0 ? "up" : "down"}`}>
                      {info.change >= 0 ? "+" : "−"}
                      {Math.abs(info.change).toFixed(2)} ({Math.abs(info.pct).toFixed(2)}%)
                    </span>
                  )}
                </div>
                <button
                  className="wl-remove"
                  title="Remove from watchlist"
                  aria-label={`Remove ${w.symbol} from watchlist`}
                  disabled={busy === w.symbol}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(w.symbol);
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
