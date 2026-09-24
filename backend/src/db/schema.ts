import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  numeric,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";

export const orderSide = pgEnum("order_side", ["BUY", "SELL"]);
export const orderType = pgEnum("order_type", ["MARKET", "LIMIT"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING",
  "FILLED",
  "CANCELLED",
  "REJECTED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
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
  price: numeric("price", { precision: 18, scale: 4 }),
  status: orderStatus("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
