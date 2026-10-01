import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { fetchPortfolio, type Portfolio } from "../lib/portfolio-api";
import { useOrderEvents } from "../hooks/useOrderEvents";
import "./PortfolioPage.css";

function pnlClass(value: string | null) {
  if (!value) return "";
  return Number(value) >= 0 ? "pnl-pos" : "pnl-neg";
}

export function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventVersion = useOrderEvents();

  useEffect(() => {
    fetchPortfolio()
      .then(setPortfolio)
      .catch(() => setError("Could not load portfolio"));
  }, [eventVersion]);

  // Also refresh every 5s regardless of push events, since unrealized P&L
  // changes purely from price movement, not from any order/trade event.
  useEffect(() => {
    const id = setInterval(() => {
      fetchPortfolio().then(setPortfolio).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <h1>Portfolio</h1>
      {error && <p className="error">{error}</p>}
      {!portfolio ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <span className="label">Cash</span>
              <span className="value">{portfolio.cash}</span>
            </div>
            <div className="summary-card">
              <span className="label">Holdings Value</span>
              <span className="value">{portfolio.holdingsValue}</span>
            </div>
            <div className="summary-card">
              <span className="label">Total Value</span>
              <span className="value">{portfolio.totalValue}</span>
            </div>
          </div>

          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Avg Cost</th>
                <th>Price</th>
                <th>Market Value</th>
                <th>Unrealized</th>
                <th>Realized</th>
                <th>Total P&L</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.positions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">No positions yet</td>
                </tr>
              ) : (
                portfolio.positions.map((p) => (
                  <tr key={p.symbol}>
                    <td>
                      <Link to={`/trade/${p.symbol}`} className="symbol-link">{p.symbol}</Link>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{p.avgCost}</td>
                    <td>{p.currentPrice ?? "—"}</td>
                    <td>{p.marketValue ?? "—"}</td>
                    <td className={pnlClass(p.unrealizedPnl)}>{p.unrealizedPnl ?? "—"}</td>
                    <td className={pnlClass(p.realizedPnl)}>{p.realizedPnl}</td>
                    <td className={pnlClass(p.totalPnl)}>{p.totalPnl ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </>
      )}
    </Layout>
  );
}