import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { fetchOrders, cancelOrder, placeOrder, type Order } from "../lib/orders-api";
import { fetchAmo, cancelAmo, type AmoOrder } from "../lib/amo-api";
import { fetchPortfolio, type Portfolio } from "../lib/portfolio-api";
import { ApiError } from "../lib/api-client";
import { useOrderEvents } from "../hooks/useOrderEvents";
import "../components/OrdersPanel.css";
import "./TradesPage.css";

type Tab = "PENDING" | "ACTIVE" | "HISTORY";
const OPEN = new Set(["PENDING", "PARTIALLY_FILLED"]);

function pnlClass(v: number | string | null) {
  if (v === null || v === "") return "";
  return Number(v) >= 0 ? "pos" : "neg";
}

export function TradesPage() {
  const [tab, setTab] = useState<Tab>("PENDING");
  const [orders, setOrders] = useState<Order[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [amo, setAmo] = useState<AmoOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventVersion = useOrderEvents();

  function load() {
    fetchOrders().then(setOrders).catch(() => setError("Could not load orders"));
    fetchPortfolio().then(setPortfolio).catch(() => setError("Could not load positions"));
    fetchAmo().then(setAmo).catch(() => {});
  }

  useEffect(load, [eventVersion]);

  // Unrealized P&L changes with price, not only with order events.
  useEffect(() => {
    const id = setInterval(() => {
      fetchPortfolio().then(setPortfolio).catch(() => {});
      fetchAmo().then(setAmo).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const pending = orders.filter((o) => OPEN.has(o.status));
  const history = orders.filter((o) => !OPEN.has(o.status));
  const amoList = amo.filter((a) => a.status === "SCHEDULED" || a.status === "FAILED");
  const positions = portfolio?.positions ?? [];
  const totalPnl = positions.reduce((sum, p) => sum + (p.totalPnl ? Number(p.totalPnl) : 0), 0);

  async function handleCancel(orderId: string) {
    setBusyId(orderId);
    setError(null);
    try {
      await cancelOrder(orderId);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancelAmo(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await cancelAmo(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSquareOff(symbol: string, quantity: number) {
    setBusyId(symbol);
    setError(null);
    try {
      await placeOrder({ symbol, side: "SELL", type: "MARKET", quantity });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Square off failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSquareOffAll() {
    setBusyId("ALL");
    setError(null);
    try {
      for (const p of positions) {
        await placeOrder({ symbol: p.symbol, side: "SELL", type: "MARKET", quantity: p.quantity });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Square off all failed");
    } finally {
      setBusyId(null);
      load();
    }
  }

  return (
    <Layout>
      <h1>Trades</h1>
      <div className="trades-tabs">
        {(["PENDING", "ACTIVE", "HISTORY"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t[0] + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && <p className="panel-error">{error}</p>}

      {tab === "PENDING" && (
        <>
          {pending.length === 0 && amoList.length === 0 && (
            <p className="empty">No pending orders</p>
          )}

          {pending.length > 0 && (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Filled</th>
                  <th>Price</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={`/trade/${o.symbol}`} className="symbol-link">{o.symbol}</Link></td>
                    <td className={o.side === "BUY" ? "buy" : "sell"}>{o.side}</td>
                    <td>{o.type}</td>
                    <td>{o.quantity}</td>
                    <td>{o.filledQuantity}</td>
                    <td>{o.price ?? "—"}</td>
                    <td>{o.status}</td>
                    <td>
                      <button className="cancel-btn" disabled={busyId === o.id} onClick={() => handleCancel(o.id)}>
                        {busyId === o.id ? "..." : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {amoList.length > 0 && (
            <>
              <h3>AMO (runs at next market open)</h3>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th>
                    <th>Price</th><th>Status</th><th>Note</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {amoList.map((a) => (
                    <tr key={a.id}>
                      <td>{a.symbol}</td>
                      <td className={a.side === "BUY" ? "buy" : "sell"}>{a.side}</td>
                      <td>{a.type}</td>
                      <td>{a.quantity}</td>
                      <td>{a.price ?? "—"}</td>
                      <td>{a.status}</td>
                      <td>{a.note ?? ""}</td>
                      <td>
                        {a.status === "SCHEDULED" && (
                          <button className="cancel-btn" disabled={busyId === a.id} onClick={() => handleCancelAmo(a.id)}>
                            {busyId === a.id ? "..." : "Cancel"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {tab === "ACTIVE" && (
        <>
          <div className="pnl-summary">
            <span>Total P&amp;L</span>
            <button
              className="cancel-btn"
              disabled={busyId === "ALL" || positions.length === 0}
              onClick={handleSquareOffAll}
            >
              {busyId === "ALL" ? "..." : "Square off all"}
            </button>
            <strong className={pnlClass(totalPnl)}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}
            </strong>
          </div>
          {positions.length === 0 ? (
            <p className="empty">No active positions</p>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Symbol</th><th>Qty</th><th>Avg cost</th><th>Price</th>
                  <th>Unrealized</th><th>Realized</th><th>Total P&amp;L</th><th></th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.symbol}>
                    <td><Link to={`/trade/${p.symbol}`} className="symbol-link">{p.symbol}</Link></td>
                    <td>{p.quantity}</td>
                    <td>{p.avgCost}</td>
                    <td>{p.currentPrice ?? "—"}</td>
                    <td className={pnlClass(p.unrealizedPnl)}>{p.unrealizedPnl ?? "—"}</td>
                    <td className={pnlClass(p.realizedPnl)}>{p.realizedPnl}</td>
                    <td className={pnlClass(p.totalPnl)}>{p.totalPnl ?? "—"}</td>
                    <td>
                      <button
                        className="cancel-btn"
                        disabled={busyId === p.symbol}
                        onClick={() => handleSquareOff(p.symbol, p.quantity)}
                      >
                        {busyId === p.symbol ? "..." : "Square off"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {tab === "HISTORY" &&
        (history.length === 0 ? (
          <p className="empty">No order history</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th>
                <th>Filled</th><th>Avg price</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{o.symbol}</td>
                  <td className={o.side === "BUY" ? "buy" : "sell"}>{o.side}</td>
                  <td>{o.type}</td>
                  <td>{o.quantity}</td>
                  <td>{o.filledQuantity}</td>
                  <td>{o.avgFillPrice ?? o.price ?? "—"}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </Layout>
  );
}