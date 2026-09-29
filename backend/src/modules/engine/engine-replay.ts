import { orderRepository } from "../orders/order.repository.js";
import { engineClient } from "./engine.client.js";

// Rebuilds the engine's in-memory book from whatever Postgres says is still
// open. Runs once at startup, before the server accepts any traffic, so
// there's no race with real orders arriving mid-replay.
export async function replayOpenOrders(): Promise<void> {
  const openOrders = await orderRepository.findOpenLimitOrders();

  if (openOrders.length === 0) {
    console.log("[replay] no open orders to replay");
    return;
  }

  console.log(`[replay] replaying ${openOrders.length} open order(s) into the engine`);

  for (const { order, symbol } of openOrders) {
    const remaining = order.quantity - order.filledQuantity;
    if (remaining <= 0) {
      continue;
    }

    const { events } = await engineClient.submitOrder({
      symbol,
      orderId: order.id,
      accountId: order.accountId,
      side: order.side,
      type: "LIMIT",
      quantity: remaining,
      price: order.price ? Number(order.price) : undefined,
    });

    // These orders were consistent (non-crossing) the moment before shutdown,
    // so replaying them in arrival order should never produce a trade. If one
    // does, something's actually inconsistent and needs a human to look at it
    // rather than the backend silently settling it.
    if (events.some((e) => e.event === "TRADE_EXECUTED")) {
      console.error(
        `[replay] order ${order.id} traded during replay — this should not happen. Manual reconciliation needed.`
      );
    }
  }

  console.log("[replay] done");
}