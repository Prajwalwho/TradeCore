import { type ReactNode } from "react";
import { Link,useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MarketStatusBar } from "./MarketStatusBar";

import "./Layout.css";

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">Paper Trading</span>

        <nav className="app-nav">
          <Link to="/dashboard">Markets</Link>
          <Link to="/portfolio">Portfolio</Link>
          <Link to="/trades">Trades</Link>
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          Log out
        </button>
      </header>
      <MarketStatusBar />
      <main className="app-main">{children}</main>
      <main className="app-main">{children}</main>
    </div>
  );
}