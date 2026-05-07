ALTER TABLE "company" ADD CONSTRAINT "company_companyId_unique" UNIQUE("companyId");
CREATE TABLE "priceHistory" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "priceHistory_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"business_date" date NOT NULL,
	"security_id" integer NOT NULL,
	"open_price" numeric(2, 18) NOT NULL,
	"high_price" numeric(2, 18) NOT NULL,
	"close_price" numeric(2, 18) NOT NULL,
	"total_trade_quantity" numeric(2, 18),
	"total_trade_value" numeric(2, 18),
	"previous_day_close_price" numeric(2, 18),
	"fifty_two_week_high" numeric(2, 18),
	"fifty_two_week_low" numeric(2, 18),
	"total_trades" numeric(2, 18),
	"average_trade_price" numeric(2, 18),
	"market_capitalization" numeric(2, 18)
);
--> statement-breakpoint
ALTER TABLE "priceHistory" ADD CONSTRAINT "price_history_security_id_fk" FOREIGN KEY ("security_id") REFERENCES "public"."company"("companyId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
