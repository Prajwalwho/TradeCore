CREATE TABLE "realized_pnl_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"instrument_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"sell_price_cents" integer NOT NULL,
	"avg_cost_cents" integer NOT NULL,
	"pnl_cents" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "realized_pnl_events" ADD CONSTRAINT "realized_pnl_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "realized_pnl_events" ADD CONSTRAINT "realized_pnl_events_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;