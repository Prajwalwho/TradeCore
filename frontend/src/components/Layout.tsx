import { createContext, useContext, type ReactNode } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_NAME } from "../brand";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { MarketStatusBar } from "./MarketStatusBar";
import { MarketMood } from "./MarketMood";
import { TickerTape } from "./TickerTape";
import { IndexTicker } from "./IndexTicker";
import { VerifyBanner } from "./VerifyBanner";

const NAV = [
  { to: "/dashboard", label: "Watchlist" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/trades", label: "Trades" },
  { to: "/tools", label: "Tools" },
  { to: "/profile", label: "Profile" },
];

const InShell = createContext(false);

function Shell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/dashboard" className="brand">
            <Logo size={28} />
            <span>{APP_NAME}</span>
          </Link>

          <nav className="app-nav">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-actions">
            <ThemeToggle />
            <button onClick={handleLogout} className="logout-btn">
              Log out
            </button>
          </div>
        </div>
      </header>
      <VerifyBanner />
      <div className="market-strip">
        <div className="market-strip-inner">
          <IndexTicker />
          <MarketMood />
          <MarketStatusBar />
        </div>
      </div>
      <TickerTape />
      <main className="app-main">{children}</main>
    </div>
  );
}

// The menu, market strip and ticker tape stay mounted while you move between pages,
// so nothing reloads or jumps. Pages keep using <Layout>; inside the shell it just passes through.
export function AppLayout() {
  return (
    <Shell>
      <InShell.Provider value={true}>
        <Outlet />
      </InShell.Provider>
    </Shell>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const inShell = useContext(InShell);
  return inShell ? <>{children}</> : <Shell>{children}</Shell>;
}
