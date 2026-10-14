import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { fetchProfile, type Profile } from "../lib/profile-api";
import { useOrderEvents } from "../hooks/useOrderEvents";
import "./ProfilePage.css";

const money = (v: string) =>
  "₹" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cls = (v: string) => (Number(v) > 0 ? "pos" : Number(v) < 0 ? "neg" : "");

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventVersion = useOrderEvents();

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => setError("Could not load profile"));
  }, [eventVersion]);

  return (
    <Layout>
      <h1>Profile</h1>
      {error && <p className="pf-error">{error}</p>}
      {!profile ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="pf-user">
            <div className="pf-avatar">{profile.email[0]?.toUpperCase()}</div>
            <div>
              <div className="pf-email">{profile.email}</div>
              <div className="pf-tag">Virtual trading account</div>
            </div>
          </div>

          <div className="pf-card">
            <h3>Your wallet</h3>
            <div className="pf-total">{money(profile.totalFunds)}</div>
            <div className="pf-row">
              <div>
                <span className="pf-label">Available funds</span>
                <span className="pf-val">{money(profile.availableFunds)}</span>
              </div>
              <div>
                <span className="pf-label">Used margin</span>
                <span className="pf-val">{money(profile.usedMargin)}</span>
              </div>
            </div>
          </div>

          <div className="pf-grid">
            <div className="pf-stat">
              <strong className="pos">{money(profile.netProfit)}</strong>
              <span>Total net profit</span>
            </div>
            <div className="pf-stat">
              <strong className="neg">{money(profile.netLoss)}</strong>
              <span>Total net loss</span>
            </div>
            <div className="pf-stat">
              <strong className="pos">{profile.positiveCount}</strong>
              <span>Positive transactions</span>
            </div>
            <div className="pf-stat">
              <strong className="neg">{profile.negativeCount}</strong>
              <span>Negative transactions</span>
            </div>
            <div className="pf-stat wide">
              <strong className={cls(profile.netPnl)}>{money(profile.netPnl)}</strong>
              <span>Net realized P&amp;L</span>
            </div>
          </div>

          <div className="pf-card">
            <h3>Report: realized P&amp;L by stock</h3>
            {profile.bySymbol.length === 0 ? (
              <p className="pf-empty">No closed trades yet. Sell something to see results here.</p>
            ) : (
              <table className="pf-table">
                <thead>
                  <tr><th>Symbol</th><th>Closed trades</th><th className="num">Realized P&amp;L</th></tr>
                </thead>
                <tbody>
                  {profile.bySymbol.map((s) => (
                    <tr key={s.symbol}>
                      <td>{s.symbol}</td>
                      <td>{s.trades}</td>
                      <td className={`num ${cls(s.pnl)}`}>{money(s.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pf-card">
            <h3>Report: recent closed trades</h3>
            {profile.recent.length === 0 ? (
              <p className="pf-empty">Nothing here yet.</p>
            ) : (
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Symbol</th><th>Qty</th>
                    <th className="num">Avg cost</th><th className="num">Sold at</th><th className="num">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.recent.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.time).toLocaleString()}</td>
                      <td>{r.symbol}</td>
                      <td>{r.quantity}</td>
                      <td className="num">{r.avgCost}</td>
                      <td className="num">{r.sellPrice}</td>
                      <td className={`num ${cls(r.pnl)}`}>{r.pnl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}