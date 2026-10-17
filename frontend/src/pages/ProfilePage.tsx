import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { fetchProfile, type Profile } from "../lib/profile-api";
import { useOrderEvents } from "../hooks/useOrderEvents";
import { inr, signedInr } from "../lib/format";

const cls = (v: string) => (Number(v) > 0 ? "pos" : Number(v) < 0 ? "neg" : "");

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventVersion = useOrderEvents();

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => setError("Could not load your profile. Refresh the page to try again."));
  }, [eventVersion]);

  // Unrealized profit moves with prices, not only with orders.
  useEffect(() => {
    const id = setInterval(() => {
      fetchProfile().then(setProfile).catch(() => {});
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Layout>
      <h1>Profile</h1>
      {error && <p className="pf-error">{error}</p>}
      {!profile ? (
        <p className="empty">Loading your profile...</p>
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
            <h3>Account value</h3>
            <div className="pf-total">{inr(profile.totalValue)}</div>
            <div className="pf-row">
              <div>
                <span className="pf-label">Cash available</span>
                <span className="pf-val">{inr(profile.availableFunds)}</span>
              </div>
              <div>
                <span className="pf-label">Held in open orders</span>
                <span className="pf-val">{inr(profile.usedMargin)}</span>
              </div>
              <div>
                <span className="pf-label">Value of your stocks</span>
                <span className="pf-val">{inr(profile.holdingsValue)}</span>
              </div>
            </div>
          </div>

          <div className="pf-grid">
            <div className="pf-stat">
              <strong className="pos">{inr(profile.netProfit)}</strong>
              <span>Profit booked on closed trades</span>
            </div>
            <div className="pf-stat">
              <strong className="neg">{inr(profile.netLoss)}</strong>
              <span>Loss booked on closed trades</span>
            </div>
            <div className="pf-stat">
              <strong className="pos">{profile.positiveCount}</strong>
              <span>Winning sells</span>
            </div>
            <div className="pf-stat">
              <strong className="neg">{profile.negativeCount}</strong>
              <span>Losing sells</span>
            </div>
            <div className="pf-stat wide">
              <strong className={cls(profile.netPnl)}>{signedInr(profile.netPnl)}</strong>
              <span>Realized P&amp;L (closed trades)</span>
            </div>
            <div className="pf-stat">
              <strong className={cls(profile.unrealizedPnl)}>{signedInr(profile.unrealizedPnl)}</strong>
              <span>Unrealized P&amp;L (stocks you still hold)</span>
            </div>
            <div className="pf-stat">
              <strong className={cls(profile.totalPnl)}>{signedInr(profile.totalPnl)}</strong>
              <span>Total P&amp;L</span>
            </div>
          </div>
          <p className="tl-note" style={{ marginTop: 0 }}>
            Realized counts only trades you have closed by selling. Unrealized is the gain or loss on shares you still hold, so it can change until you sell.
          </p>

          <div className="pf-card">
            <h3>Realized P&amp;L by stock</h3>
            {profile.bySymbol.length === 0 ? (
              <p className="pf-empty">No closed trades yet. Sell a stock you hold to see results here.</p>
            ) : (
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Closed trades</th>
                    <th className="num">Realized P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.bySymbol.map((s) => (
                    <tr key={s.symbol}>
                      <td>{s.symbol}</td>
                      <td>{s.trades}</td>
                      <td className={`num ${cls(s.pnl)}`}>{signedInr(s.pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="pf-card">
            <h3>Recent closed trades</h3>
            {profile.recent.length === 0 ? (
              <p className="pf-empty">Nothing here yet.</p>
            ) : (
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Stock</th>
                    <th>Qty</th>
                    <th className="num">Avg cost</th>
                    <th className="num">Sold at</th>
                    <th className="num">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.recent.map((r, i) => (
                    <tr key={i}>
                      <td>{new Date(r.time).toLocaleString("en-IN")}</td>
                      <td>{r.symbol}</td>
                      <td>{r.quantity}</td>
                      <td className="num">{inr(r.avgCost)}</td>
                      <td className="num">{inr(r.sellPrice)}</td>
                      <td className={`num ${cls(r.pnl)}`}>{signedInr(r.pnl)}</td>
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
