import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { APP_NAME } from "../brand";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { CandleBackdrop } from "./CandleBackdrop";

type Props = { title: string; subtitle?: string; children: ReactNode };

export function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <CandleBackdrop className="aside-candles" />
        <Link to="/" className="brand">
          <Logo size={32} />
          <span>{APP_NAME}</span>
        </Link>
        <div>
          <h2>Learn the market by trading it, without risking a rupee.</h2>
          <ul>
            <li>Start with ₹10,00,000 of virtual cash</li>
            <li>Prices come from real markets, delayed</li>
            <li>Your orders go through a real matching engine</li>
          </ul>
        </div>
        <p className="auth-fine">Virtual money only. Not investment advice.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="auth-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
