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
	"instrument_type" varchar(50)
);
