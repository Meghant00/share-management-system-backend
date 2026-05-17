CREATE TABLE "price_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"business_date" date NOT NULL,
	"security_id" integer NOT NULL,
	"open_price" numeric(18, 2) NOT NULL,
	"high_price" numeric(18, 2) NOT NULL,
	"close_price" numeric(18, 2),
	"total_trade_quantity" numeric(18, 2),
	"total_trade_value" numeric(18, 2),
	"previous_day_close_price" numeric(18, 2),
	"fifty_two_week_high" numeric(18, 2),
	"fifty_two_week_low" numeric(18, 2),
	"total_trades" numeric(18, 2),
	"average_trade_price" numeric(18, 2),
	"market_capitalization" numeric(18, 2)
);
--> statement-breakpoint
DROP TABLE "priceHistory" CASCADE;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_security_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."company"("companyId") ON DELETE no action ON UPDATE no action;