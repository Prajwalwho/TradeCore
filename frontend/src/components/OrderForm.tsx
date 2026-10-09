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
  const [quantity, setQuantity] = useState("1");
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

  const effectivePrice =
    type === "LIMIT" ? Number(price) || 0 : currentPrice ?? 0;
  const parsedQty = Number(quantity) || 0;
  const estimatedCost = effectivePrice * parsedQty;

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
      setQuantity("1");
      setPrice("");
      await refreshAccountInfo();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Order failed");
    } finally {
      setSubmitting(false);
    }
  }

  function adjustQty(delta: number) {
    const next = Math.max(1, (Number(quantity) || 0) + delta);
    setQuantity(String(next));
  }

  return (
    <div className="order-ticket">
      <div className="ticket-summary">
        <div className="summary-item">
          <span className="label">Available Cash</span>
          <span className="value">₹{balance ?? "—"}</span>
        </div>
        <div className="summary-item">
          <span className="label">{symbol} Held</span>
          <span className="value">{position?.quantity ?? 0} shares</span>
        </div>
      </div>

      <div className="side-toggle">
        <button
          type="button"
          className={side === "BUY" ? "side-btn buy active" : "side-btn buy"}
          onClick={() => setSide("BUY")}
        >
          BUY
        </button>
        <button
          type="button"
          className={side === "SELL" ? "side-btn sell active" : "side-btn sell"}
          onClick={() => setSide("SELL")}
        >
          SELL
        </button>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        <div className="type-toggle">
          <button
            type="button"
            className={type === "MARKET" ? "type-btn active" : "type-btn"}
            onClick={() => setType("MARKET")}
          >
            Market
          </button>
          <button
            type="button"
            className={type === "LIMIT" ? "type-btn active" : "type-btn"}
            onClick={() => setType("LIMIT")}
          >
            Limit
          </button>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Quantity</span>
            <div className="qty-stepper">
              <button type="button" onClick={() => adjustQty(-1)}>−</button>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <button type="button" onClick={() => adjustQty(1)}>+</button>
            </div>
          </label>

          <label className="field">
            <span>Price {type === "MARKET" && "(Market)"}</span>
            {type === "LIMIT" ? (
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice ? currentPrice.toFixed(2) : ""}
                required
              />
            ) : (
              <div className="market-price-display">
                {currentPrice ? currentPrice.toFixed(2) : "—"}
              </div>
            )}
          </label>
        </div>

        <div className="estimate-box">
          <span>Est. {side === "BUY" ? "Cost" : "Proceeds"}</span>
          <span className="estimate-value">
            ₹{estimatedCost ? estimatedCost.toFixed(2) : "0.00"}
          </span>
        </div>

        {error && <p className="ticket-error">{error}</p>}
        {lastOrder && (
          <p
            className={
              lastOrder.status === "REJECTED" ? "ticket-error" : "ticket-success"
            }
          >
            {lastOrder.status} — filled {lastOrder.filledQuantity}/{lastOrder.quantity}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`ticket-submit ${side.toLowerCase()}`}
        >
          {submitting ? "Placing..." : `${side === "BUY" ? "Buy" : "Sell"} ${symbol}`}
        </button>
      </form>
    </div>
  );
}