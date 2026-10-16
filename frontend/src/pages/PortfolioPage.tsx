import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { fetchPortfolio, type Portfolio } from "../lib/portfolio-api";
import { useOrderEvents } from "../hooks/useOrderEvents";
import { inr, signedInr } from "../lib/format";

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
      .catch(() => setError("Could not load your portfolio. Refresh the page to try again."));
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
        <p className="empty">Loading your portfolio...</p>
      ) : (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <span className="label">Cash</span>
              <span className="value">{inr(portfolio.cash)}</span>
            </div>
            <div className="summary-card">
              <span className="label">Holdings value</span>
              <span className="value">{inr(portfolio.holdingsValue)}</span>
            </div>
            <div className="summary-card">
              <span className="label">Total value</span>
              <span className="value">{inr(portfolio.totalValue)}</span>
            </div>
          </div>

          {portfolio.positions.length === 0 ? (
            <div className="card empty-state">
              <h3>You don't hold any stocks yet</h3>
              <p>Pick a stock from your watchlist and place your first order.</p>
              <Link to="/dashboard" className="btn btn-primary">
                Go to watchlist
              </Link>
            </div>
          ) : (
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Qty</th>
                  <th>Avg cost</th>
                  <th>Price</th>
                  <th>Market value</th>
                  <th>Unrealized</th>
                  <th>Realized</th>
                  <th>Total P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((p) => (
                  <tr key={p.symbol}>
                    <td>
                      <Link to={`/trade/${p.symbol}`} className="symbol-link">
                        {p.symbol}
                      </Link>
                    </td>
                    <td>{p.quantity}</td>
                    <td>{inr(p.avgCost)}</td>
                    <td>{inr(p.currentPrice)}</td>
                    <td>{inr(p.marketValue)}</td>
                    <td className={pnlClass(p.unrealizedPnl)}>{signedInr(p.unrealizedPnl)}</td>
                    <td className={pnlClass(p.realizedPnl)}>{signedInr(p.realizedPnl)}</td>
                    <td className={pnlClass(p.totalPnl)}>{signedInr(p.totalPnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </Layout>
  );
}
