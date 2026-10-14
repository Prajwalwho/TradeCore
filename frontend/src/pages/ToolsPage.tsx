import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { fetchMovers, fetchNews, type Movers, type Mover, type NewsItem } from "../lib/tools-api";
import { LESSONS } from "./learn-content";
import "./ToolsPage.css";

type Tab = "MOVERS" | "NEWS" | "LEARN";

const NEWS_OPTIONS = ["ALL", "RELIANCE", "TCS", "INFY", "AAPL", "TSLA"];

function MoverTable({ rows, empty }: { rows: Mover[]; empty: string }) {
  const navigate = useNavigate();
  if (rows.length === 0) return <p className="tl-empty">{empty}</p>;
  return (
    <table className="tl-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th className="num">Price</th>
          <th className="num">Change</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.symbol} onClick={() => navigate(`/trade/${r.symbol}`)}>
            <td className="sym">{r.symbol}</td>
            <td className="num">{r.price.toFixed(2)}</td>
            <td className={`num ${r.change >= 0 ? "up" : "down"}`}>
              {r.change >= 0 ? "▲" : "▼"} {Math.abs(r.change).toFixed(2)} ({Math.abs(r.changePct).toFixed(2)}%)
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ToolsPage() {
  const [tab, setTab] = useState<Tab>("MOVERS");
  const [movers, setMovers] = useState<Movers | null>(null);
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [newsSymbol, setNewsSymbol] = useState("ALL");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "MOVERS") return;
    const load = () =>
      fetchMovers()
        .then(setMovers)
        .catch(() => setError("Could not load movers"));
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [tab]);

  useEffect(() => {
    if (tab !== "NEWS") return;
    setNews(null);
    fetchNews(newsSymbol)
      .then(setNews)
      .catch(() => setError("Could not load news"));
  }, [tab, newsSymbol]);

  return (
    <Layout>
      <h1>Tools</h1>
      <div className="tl-tabs">
        {(["MOVERS", "NEWS", "LEARN"] as Tab[]).map((t) => (
          <button
            key={t}
            className={tab === t ? "tab active" : "tab"}
            onClick={() => {
              setError(null);
              setTab(t);
            }}
          >
            {t === "MOVERS" ? "Market movers" : t === "NEWS" ? "News" : "Learn"}
          </button>
        ))}
      </div>

      {error && <p className="tl-error">{error}</p>}

      {tab === "MOVERS" &&
        (!movers ? (
          <p className="tl-empty">Loading...</p>
        ) : (
          <>
            <h3 className="tl-h up">Top gainers</h3>
            <MoverTable rows={movers.gainers} empty="No gainers right now" />
            <h3 className="tl-h down">Top losers</h3>
            <MoverTable rows={movers.losers} empty="No losers right now" />
          </>
        ))}

      {tab === "NEWS" && (
        <>
          <div className="tl-filter">
            <label>
              Show news for{" "}
              <select value={newsSymbol} onChange={(e) => setNewsSymbol(e.target.value)}>
                {NEWS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o === "ALL" ? "General market" : o}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!news ? (
            <p className="tl-empty">Loading...</p>
          ) : news.length === 0 ? (
            <p className="tl-empty">No news found right now.</p>
          ) : (
            <div className="tl-news">
              {news.map((n) => (
                <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer" className="tl-news-item">
                  <span className="tl-news-title">{n.title}</span>
                  <span className="tl-news-meta">
                    {n.publisher}
                    {n.publisher ? " · " : ""}
                    {new Date(n.publishedAt).toLocaleString()}
                  </span>
                </a>
              ))}
            </div>
          )}
          <p className="tl-note">Headlines are provided by Yahoo Finance. Click to read the full story at the source.</p>
        </>
      )}

      {tab === "LEARN" && (
        <div className="tl-learn">
          {LESSONS.map((l) => (
            <details key={l.title} className="tl-lesson">
              <summary>{l.title}</summary>
              <p>{l.body}</p>
            </details>
          ))}
        </div>
      )}
    </Layout>
  );
}