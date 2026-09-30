import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { logout } = useAuth();
  return (
    <div style={{ padding: "2rem", color: "#e2e8f0", background: "#0f172a", minHeight: "100vh" }}>
      <h1>Dashboard (placeholder — built properly on Day 25)</h1>
      <button onClick={logout}>Log out</button>
    </div>
  );
}