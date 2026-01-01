CREATE TABLE "floorsheet" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "floorsheet_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"contract_id" bigint NOT NULL,
	"stock_symbol" varchar(50) NOT NULL,
	"contract_quantity" bigint NOT NULL,
	"contract_rate" numeric(18, 2) NOT NULL,
	"contract_amount" numeric(18, 2) NOT NULL,
	"buyer_member_id" varchar(50) NOT NULL,
	"seller_member_id" varchar(50) NOT NULL,
	"buyer_broker_name" text,
	"seller_broker_name" text,
	"business_date" date NOT NULL,
	"trade_time" time,
	"security_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
