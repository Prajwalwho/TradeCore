import { useEffect, useState, type FormEvent } from "react";
import { fetchAccount } from "../lib/account-api";
import { fetchPositions, type Position } from "../lib/positions-api";
import { placeOrder, type Order, type OrderType, type Side } from "../lib/orders-api";
import { ApiError } from "../lib/api-client";
import "./OrderForm.css";

type Props = {
  symbol: string;
  currentPrice: number | null;
};

export function OrderForm({ symbol, currentPrice }: Props) {
  const [side, setSide] = useState<Side>("BUY");
  const [type, setType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [balance, setBalance] = useState<string | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  async function refreshAccountInfo() {
    const [account, positions] = await Promise.all([fetchAccount(), fetchPositions()]);
    setBalance(account.balance);
    setPosition(positions.find((p) => p.symbol === symbol) ?? null);
  }

  useEffect(() => {
    refreshAccountInfo().catch(() => setError("Could not load account info"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLastOrder(null);

    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number");
      return;
    }

    const parsedPrice = type === "LIMIT" ? Number(price) : undefined;
    if (type === "LIMIT" && (!parsedPrice || parsedPrice <= 0)) {
      setError("Price must be a positive number for limit orders");
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        symbol,
        side,
        type,
        quantity: parsedQuantity,
        price: parsedPrice,
      });
      setLastOrder(order);
      setQuantity("");
      setPrice("");
      await refreshAccountInfo(); // balance/position changed if this order matched
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="order-form-card">
      <div className="account-summary">
        <div>
          <span className="label">Cash</span>
          <span className="value">{balance ?? "—"}</span>
        </div>
        <div>
          <span className="label">{symbol} held</span>
          <span className="value">{position?.quantity ?? 0}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="toggle-group">
          <button
            type="button"
            className={side === "BUY" ? "toggle-btn active buy" : "toggle-btn"}
            onClick={() => setSide("BUY")}
          >
            Buy
          </button>
          <button
            type="button"
            className={side === "SELL" ? "toggle-btn active sell" : "toggle-btn"}
            onClick={() => setSide("SELL")}
          >
            Sell
          </button>
        </div>

        <div className="toggle-group">
          <button
            type="button"
            className={type === "MARKET" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setType("MARKET")}
          >
            Market
          </button>
          <button
            type="button"
            className={type === "LIMIT" ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setType("LIMIT")}
          >
            Limit
          </button>
        </div>

        <label>
          Quantity
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>

        {type === "LIMIT" && (
          <label>
            Price
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={currentPrice ? currentPrice.toFixed(2) : undefined}
              required
            />
          </label>
        )}

        {type === "MARKET" && currentPrice && (
          <p className="hint">Current price: {currentPrice.toFixed(2)}</p>
        )}

        {error && <p className="error">{error}</p>}
        {lastOrder && (
          <p className="success">
            Order {lastOrder.status.toLowerCase()} — filled {lastOrder.filledQuantity}/
            {lastOrder.quantity}
          </p>
        )}

        <button type="submit" disabled={submitting} className={`submit-btn ${side.toLowerCase()}`}>
          {submitting ? "Placing..." : `${side === "BUY" ? "Buy" : "Sell"} ${symbol}`}
        </button>
      </form>
    </div>
  );
}