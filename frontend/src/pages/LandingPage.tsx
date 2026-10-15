import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "../brand";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { PriceCell } from "../components/PriceCell";
import { TickerTapeView } from "../components/TickerTape";
import { CandleBackdrop } from "../components/CandleBackdrop";
import { apiFetch } from "../lib/api-client";
import { avatarColor, initials } from "../lib/avatar";
import type { PricePoint } from "../lib/market-api";

const SHOWCASE = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "AAPL"];

export function LandingPage() {
  const [prices, setPrices] = useState<PricePoint[]>([]);

  useEffect(() => {
    const load = () =>
      apiFetch<PricePoint[]>("/market-data")
        .then(setPrices)
        .catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, []);

  const rows = SHOWCASE.map((s) => prices.find((p) => p.symbol === s)).filter(
    (p): p is PricePoint => Boolean(p)
  );

  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="brand">
          <Logo size={30} />
          <span>{APP_NAME}</span>
        </span>
        <div className="landing-actions">
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Create free account
          </Link>
        </div>
      </nav>

      <TickerTapeView items={prices} />

      <section className="hero">
        <div>
          <h1>Learn to trade with real market prices and no real risk.</h1>
          <p className="lead">
            Buy and sell Indian and US stocks with ₹10,00,000 of virtual cash. Your orders are matched in a real
            order book, and your profit and loss update as prices move.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="btn btn-primary btn-lg">
              Create free account
            </Link>
            <Link to="/login" className="btn btn-ghost btn-lg">
              Log in
            </Link>
          </div>
          <p className="hero-note">Prices are delayed and come from a free, unofficial source.</p>
        </div>

        {rows.length > 0 && (
          <div className="card live-card">
            <div className="live-head">
              Live prices{" "}
              <span>
                <i className="dot open" /> Delayed
              </span>
            </div>
            {rows.map((p) => {
              const change = p.previousClose ? p.price - p.previousClose : null;
              const pct = change !== null && p.previousClose ? (change / p.previousClose) * 100 : null;
              return (
                <div key={p.symbol} className="live-row">
                  <span className="avatar sm" style={{ background: avatarColor(p.symbol) }}>
                    {initials(p.symbol)}
                  </span>
                  <span className="live-sym">{p.symbol}</span>
                  <span className="live-price">
                    <PriceCell prefix="₹" value={p.price} />
                    {change !== null && pct !== null && (
                      <span className={`pill ${change >= 0 ? "up" : "down"}`}>
                        {change >= 0 ? "▲ +" : "▼ −"}
                        {Math.abs(pct).toFixed(2)}%
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <span className="blob a" />
        <span className="blob b" />
        <CandleBackdrop className="hero-bg" />
      </section>

      <section className="section">
        <h2>What you can do</h2>
        <div className="feature-list">
          <div className="feature-row">
            <h4>Trade with market and limit orders</h4>
            <p>Orders match by price and time, with partial fills and cancellation, just like on an exchange.</p>
          </div>
          <div className="feature-row">
            <h4>Queue orders while the market is closed</h4>
            <p>After-market orders wait and run when the exchange opens.</p>
          </div>
          <div className="feature-row">
            <h4>Track your profit and loss</h4>
            <p>See average cost, realized and unrealized profit, and every closed trade.</p>
          </div>
          <div className="feature-row">
            <h4>Follow Indian and US stocks together</h4>
            <p>US prices are shown in rupees at the live exchange rate, so you keep one balance.</p>
          </div>
          <div className="feature-row">
            <h4>Learn as you go</h4>
            <p>Short lessons on order types, spread and profit and loss, with market movers and news.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Get started in three steps</h2>
        <div className="steps">
          <div className="card step">
            <h4>Create an account</h4>
            <p>It takes a minute and costs nothing.</p>
          </div>
          <div className="card step">
            <h4>Confirm your email</h4>
            <p>Open the link we send you to unlock trading.</p>
          </div>
          <div className="card step">
            <h4>Place your first order</h4>
            <p>Pick a stock from your watchlist and buy it with virtual cash.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>What to keep in mind</h2>
        <ul className="limits">
          <li>All money is virtual. No order is ever sent to a real exchange.</li>
          <li>Prices are delayed and come from an unofficial source, so they can be wrong or missing.</li>
          <li>This is for practice. It is not investment advice.</li>
        </ul>
      </section>

      <footer className="footer">{APP_NAME} is a learning project.</footer>
    </div>
  );
}
