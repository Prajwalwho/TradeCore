# Demo Script

A ~3-minute guided walkthrough of the platform's core features.

1. **Register two accounts** (e.g. `buyer@demo.com`, `seller@demo.com`) — show the ₹10,00,000 starting balance.
2. **Open the Markets dashboard** — point out prices updating live, with no page refresh (WebSocket + Redis pub/sub).
3. **As the seller**, place a limit sell order on AAPL slightly above the live price. Show it appear as `PENDING` in Open Orders.
4. **As the buyer**, place a market buy for the same instrument. Show it fill, and switch back to the seller's tab — their order fills too, live, without them refreshing (real-time push).
5. **Try an invalid order** — e.g. sell more shares than held — show the real validation error (`Insufficient shares`) surfacing from the backend.
6. **Open the Portfolio page** — show average cost, realized P&L (from the trade just made), and unrealized P&L updating as the live price moves.
7. *(Optional, if asked about the hard part)* Open `engine/tests/OrderBookTests.cpp` and walk through one test — e.g. `CrossingLimitTradesAtRestingPrice` — to explain price-time priority and show the 37-test suite passing.