CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instrument_id" uuid NOT NULL,
	"buy_order_id" uuid NOT NULL,
	"sell_order_id" uuid NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"quantity" integer NOT NULL,
	"executed_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_buy_order_id_orders_id_fk" FOREIGN KEY ("buy_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_sell_order_id_orders_id_fk" FOREIGN KEY ("sell_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;