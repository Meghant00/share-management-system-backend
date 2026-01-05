CREATE TABLE "broker" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "broker_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"code" integer NOT NULL,
	"tmslink" varchar(255) NOT NULL,
	CONSTRAINT "broker_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "company" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "company_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"companyId" integer,
	"company_name" varchar(255) NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"security_name" varchar(255) NOT NULL,
	"status" varchar(1) NOT NULL,
	"company_email" varchar(255),
	"website" varchar(255),
	"sector_name" varchar(150),
	"regulatory_body" varchar(150),
	"instrument_type" varchar(50),
	CONSTRAINT "company_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "floorsheet" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "floorsheet_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"contract_id" bigint NOT NULL,
	"stock_symbol" varchar(50) NOT NULL,
	"contract_quantity" bigint NOT NULL,
	"contract_rate" numeric(18, 2) NOT NULL,
	"contract_amount" numeric(18, 2) NOT NULL,
	"buyer_member_id" integer NOT NULL,
	"seller_member_id" integer NOT NULL,
	"business_date" date NOT NULL,
	"trade_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "floorsheet" ADD CONSTRAINT "floorsheet_stock_symbol_fk" FOREIGN KEY ("stock_symbol") REFERENCES "public"."company"("symbol") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floorsheet" ADD CONSTRAINT "floorsheet_buyer_member_id_fk" FOREIGN KEY ("buyer_member_id") REFERENCES "public"."broker"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floorsheet" ADD CONSTRAINT "floorsheet_seller_member_id_fk" FOREIGN KEY ("seller_member_id") REFERENCES "public"."broker"("code") ON DELETE no action ON UPDATE no action;