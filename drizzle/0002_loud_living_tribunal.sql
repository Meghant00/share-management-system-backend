ALTER TABLE "priceHistory" ALTER COLUMN "open_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "high_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "close_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "total_trade_quantity" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "total_trade_value" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "previous_day_close_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "fifty_two_week_high" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "fifty_two_week_low" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "total_trades" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "average_trade_price" SET DATA TYPE numeric(18, 2);--> statement-breakpoint
ALTER TABLE "priceHistory" ALTER COLUMN "market_capitalization" SET DATA TYPE numeric(18, 2);