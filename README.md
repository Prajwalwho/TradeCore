
Readme · MD
# Paper Trading Platform
 
A paper (virtual-money) trading platform that uses **real market prices**. It has a custom C++ matching engine, a Node.js/TypeScript backend, and a React frontend. Users trade with virtual cash and get a realistic trading experience without risking real money.
 
> No order is ever sent to a real exchange. All money is virtual.
 
![screenshot placeholder](docs/screenshot.png)
 
## What it does
 
Users register, get a virtual ₹10,00,000 balance, and place market and limit buy/sell orders on a small set of instruments (AAPL, TSLA, RELIANCE, TCS, INFY). Prices come from Yahoo Finance, and the chart shows real 1-minute candles from the most recent session.
 
Orders are matched by a custom C++ engine using price-time priority. Trades settle transactionally in Postgres: cash moves, positions update with average-cost basis, and realized and unrealized P&L are tracked. Order and trade updates reach the browser in real time over WebSocket.
 
### Liquidity: the market maker
 
Orders only match against resting orders, and a small user base cannot supply liquidity on its own. A built-in **market-maker account** quotes 3 bids and 3 asks per instrument around the live price (±0.10%, ±0.20% and ±0.30%, 2,000 shares per level) and re-quotes when the price moves 0.05% or more, or when its quotes are used up. Market orders therefore fill immediately, through the same engine and settlement path as every other order. The market maker has no special code path in settlement, so money conservation holds across all accounts.
 
It is **off by default** and enabled with `MARKET_MAKER_ENABLED=true`.
 
## Architecture
 
```mermaid
graph TD
    subgraph Browser
        FE[React Frontend<br/>Vite + TS]
    end
 
    subgraph "Node.js Backend"
        API[Fastify REST API]
        WS[WebSocket Server]
        SETTLE[Settlement Service]
        MD[Market Data<br/>Yahoo Finance poller]
        MM[Market Maker]
    end
 
    subgraph "C++ Matching Engine"
        ENGINE[engine_server<br/>Order Book + Matching]
    end
 
    PG[(PostgreSQL)]
    REDIS[(Redis<br/>Pub/Sub)]
    YAHOO[(Yahoo Finance)]
 
    FE -- "REST (fetch)" --> API
    FE -- "WebSocket" --> WS
    API -- "JSON over stdin/stdout" --> ENGINE
    API -- reads/writes --> PG
    SETTLE -- "trades, orders, balances, positions" --> PG
    SETTLE -- "publish events" --> REDIS
    MD -- "prices every 15s" --> YAHOO
    MD -- "publish ticks" --> REDIS
    MM -- "quotes via the normal order path" --> API
    WS -- "subscribe" --> REDIS
    API --> SETTLE
```
 
**Why a separate C++ engine?** Matching is a classic systems problem: deterministic, single-threaded per book, and performance-sensitive. Keeping it isolated makes it independently testable (37 unit tests, GoogleTest).
 
**Why Postgres is the source of truth.** The engine's book lives in memory. Every order is persisted to Postgres before it is sent to the engine. If the backend restarts, open limit orders are replayed into a fresh engine, rebuilding the same book without creating trades. If settlement fails after the engine has matched, the backend halts the engine instead of letting it run ahead of the database.
 
**Why Redis sits between the backend and WebSocket clients.** Price ticks and per-user order/trade events go through Redis pub/sub, so the real-time layer is not tied to a single process.
 
## Tech stack
 
| Layer | Technology |
|---|---|
| Matching engine | C++20, CMake, GoogleTest |
| Backend | Node.js, TypeScript, Fastify, Drizzle ORM |
| Database | PostgreSQL 17 |
| Real-time | WebSocket (`ws`), Redis pub/sub |
| Market data | Yahoo Finance (unofficial chart endpoint) |
| Frontend | React 19, TypeScript, Vite, React Router, TradingView Lightweight Charts |
| Infra (dev) | Docker Compose (Postgres + Redis) |
 
## Key engineering decisions
 
- **Price-time priority matching**: bids sorted descending and asks ascending (`std::map`), each price level a FIFO queue (`std::deque`).
- **Trades execute at the resting order's price**, as on a real exchange.
- **Integer-cents arithmetic** for all money math in the backend.
- **Funds and shares are reserved before an order reaches the engine.** A market buy gets a price cap derived from available cash. A sell is checked against shares held minus shares already committed to open sells.
- **Serialized order processing.** Funds check, persist, match, settle, and cancel run through one queue, so two orders can never pass the same funds check.
- **One Postgres transaction per settlement.** The trade, both order updates, both cash balances, and both positions commit together or not at all.
- **Database safety nets.** `CHECK` constraints keep balances and position quantities non-negative. P&L is stored as `bigint`.
- **Average-cost positions** with realized P&L booked on each sell. Unrealized P&L is computed on read against the current price and never stored.
## Project structure
 
```
engine/     C++ matching engine (CMake build, GoogleTest suite)
backend/    Fastify API, Drizzle/Postgres, Redis, WebSocket server, market maker
frontend/   React + Vite client
docs/       Demo script and notes
```
 
## Running locally
 
**Prerequisites:** Node.js 22, a C++20 compiler, CMake, `nlohmann-json`, Docker.
 
```bash
# 1. Start Postgres + Redis
docker compose up -d
 
# 2. Build the matching engine
cmake -S engine -B engine/build -DCMAKE_BUILD_TYPE=Release
cmake --build engine/build --target engine_server
 
# 3. Backend setup (needs backend/.env, see below)
cd backend
npm install
npx drizzle-kit migrate
npx tsx scripts/seed-instruments.ts
 
# 4. Optional: create the market-maker account, then set MARKET_MAKER_ENABLED=true
npx tsx scripts/seed-market-maker.ts
 
# 5. Build and start the backend
npx tsc
node dist/index.js
 
# 6. Start the frontend (new terminal)
cd frontend
npm install
npm run dev
```
 
**`backend/.env`** (all values here are development defaults):
 
```
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USER=trading
DB_PASSWORD=trading_dev
DB_NAME=paper_trading
REDIS_HOST=localhost
REDIS_PORT=6380
DATABASE_URL=postgresql://trading:trading_dev@localhost:5433/paper_trading
JWT_SECRET=<generate with: openssl rand -hex 32>
MARKET_MAKER_ENABLED=true
```
 
Put each variable on its own line. Never commit `.env`.
 
## Limitations
 
- **Market data is unofficial and delayed.** Prices come from Yahoo Finance's free chart endpoint, polled every 15 seconds. It has no SLA, it is usually delayed by a few minutes, and it can rate-limit or change without notice. This is not a licensed real-time feed.
- **Prices are flat outside market hours.** NSE trades 9:15 to 15:30 IST. US markets open at about 19:00 IST. While a market is closed, users trade at the last known price.
- **Mixed currencies (known issue).** Cash is in rupees, but AAPL and TSLA are priced in US dollars. This will be fixed with per-instrument currencies.
- **Matching is internal.** Orders match inside this app's own order book, against other users and the market maker, not against a real exchange's book.
- **Not production-ready for the public yet.** Rate limiting, email verification, password reset, HTTPS and backups are not done.
## Status
 
Working end-to-end: auth, accounts, live prices and candles, order matching, settlement, positions and P&L, real-time updates, and market-maker liquidity. The engine has 37 unit tests. Backend integration tests and an engine benchmark are planned. See [`docs/demo-script.md`](docs/demo-script.md) for a guided walkthrough.

## Tests and performance

Backend integration tests run the real app against a separate Postgres database and check settlement, funds and share reservation, price-time priority, cancellation, and that total cash across all accounts never changes (`npm test`).

Measured on an Intel Core i5-13420H laptop (WSL2, Docker Postgres):

| What | Result |
|---|---|
| C++ engine through its JSON stdin/stdout protocol | about 38,000 orders/sec (200,000 random limit orders, 78% trading); single-order round trip p50 87 µs, p99 278 µs |
| Full order path: funds check, Postgres, engine, settlement transaction | about 70 orders/sec, about 36 settled trades/sec |

The full path is much slower by design: orders are processed one at a time so two orders can never pass the same funds check, and each one makes several database round trips.