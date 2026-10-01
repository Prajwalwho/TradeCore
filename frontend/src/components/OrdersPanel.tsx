import { useEffect, useState } from "react";
import { fetchOrders, cancelOrder, type Order } from "../lib/orders-api";
import { ApiError } from "../lib/api-client";
import { useOrderEvents } from "../hooks/useOrderEvents";
import "./OrdersPanel.css";

type Props = { symbol: string };

const OPEN_STATUSES = new Set(["PENDING", "PARTIALLY_FILLED"]);

export function OrdersPanel({ symbol }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventVersion = useOrderEvents();

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("Could not load orders"));
  }, [symbol, eventVersion]); // refetch whenever a push event says something changed

  const forSymbol = orders.filter((o) => o.symbol === symbol);
  const open = forSymbol.filter((o) => OPEN_STATUSES.has(o.status));
  const history = forSymbol
    .filter((o) => !OPEN_STATUSES.has(o.status))
    .slice(0, 10); // most recent 10, findByAccountId already orders by createdAt desc

  async function handleCancel(orderId: string) {
    setCancellingId(orderId);
    setError(null);
    try {
      await cancelOrder(orderId);
      // No need to manually refetch: the backend's cancel emits an order_update
      // push event (Day 23), which bumps eventVersion and triggers the effect above.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="orders-panel">
      {error && <p className="panel-error">{error}</p>}

      <h3>Open orders</h3>
      {open.length === 0 ? (
        <p className="empty">No open orders for {symbol}</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Side</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Filled</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {open.map((o) => (
              <tr key={o.id}>
                <td className={o.side === "BUY" ? "buy" : "sell"}>{o.side}</td>
                <td>{o.type}</td>
                <td>{o.quantity}</td>
                <td>{o.filledQuantity}</td>
                <td>{o.price ?? "—"}</td>
                <td>{o.status}</td>
                <td>
                  <button
                    onClick={() => handleCancel(o.id)}
                    disabled={cancellingId === o.id}
                    className="cancel-btn"
                  >
                    {cancellingId === o.id ? "..." : "Cancel"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Recent history</h3>
      {history.length === 0 ? (
        <p className="empty">No order history for {symbol}</p>
      ) : (
        <table className="orders-table">
          <thead>
            <tr>
              <th>Side</th>
              <th>Type</th>
              <th>Qty</th>
              <th>Filled</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((o) => (
              <tr key={o.id}>
                <td className={o.side === "BUY" ? "buy" : "sell"}>{o.side}</td>
                <td>{o.type}</td>
                <td>{o.quantity}</td>
                <td>{o.filledQuantity}</td>
                <td>{o.price ?? "—"}</td>
                <td>{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}