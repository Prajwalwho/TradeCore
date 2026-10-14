import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  integer,
  bigint,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";

export const orderSide = pgEnum("order_side", ["BUY", "SELL"]);
export const orderType = pgEnum("order_type", ["MARKET", "LIMIT"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING",
  "PARTIALLY_FILLED",
  "FILLED",
  "CANCELLED",
  "REJECTED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const instruments = pgTable("instruments", {
  id: uuid("id").defaultRandom().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  side: orderSide("side").notNull(),
  type: orderType("type").notNull(),
  quantity: integer("quantity").notNull(),
  filledQuantity: integer("filled_quantity").notNull().default(0),
  price: numeric("price", { precision: 18, scale: 4 }),
  status: orderStatus("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: uuid("id").defaultRandom().primaryKey(),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  buyOrderId: uuid("buy_order_id")
    .notNull()
    .references(() => orders.id),
  sellOrderId: uuid("sell_order_id")
    .notNull()
    .references(() => orders.id),
  price: numeric("price", { precision: 18, scale: 4 }).notNull(),
  quantity: integer("quantity").notNull(),
  executedAt: timestamp("executed_at").notNull(),
});

export const positions = pgTable(
  "positions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    quantity: integer("quantity").notNull().default(0),
    avgCostCents: integer("avg_cost_cents").notNull().default(0),
    realizedPnlCents: bigint("realized_pnl_cents", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("positions_account_instrument_unique").on(table.accountId, table.instrumentId)]
);

export const scheduledOrders = pgTable("scheduled_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  side: orderSide("side").notNull(),
  type: orderType("type").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 18, scale: 4 }),
  status: varchar("status", { length: 20 }).notNull().default("SCHEDULED"),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const watchlistItems = pgTable(
  "watchlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    instrumentId: uuid("instrument_id")
      .notNull()
      .references(() => instruments.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("watchlist_user_instrument_unique").on(table.userId, table.instrumentId)]
);

export const realizedPnlEvents = pgTable("realized_pnl_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id),
  instrumentId: uuid("instrument_id")
    .notNull()
    .references(() => instruments.id),
  quantity: integer("quantity").notNull(),
  sellPriceCents: integer("sell_price_cents").notNull(),
  avgCostCents: integer("avg_cost_cents").notNull(),
  pnlCents: bigint("pnl_cents", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
