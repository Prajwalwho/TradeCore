ALTER TYPE "public"."order_status" ADD VALUE 'PARTIALLY_FILLED' BEFORE 'FILLED';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "filled_quantity" integer DEFAULT 0 NOT NULL;