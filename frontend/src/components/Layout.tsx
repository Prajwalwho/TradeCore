import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
        <button onClick={handleLogout} className="logout-btn">
          Log out
        </button>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}