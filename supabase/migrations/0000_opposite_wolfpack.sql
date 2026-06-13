CREATE TABLE "customers" (
	"customer_id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"segment" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"region" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" text PRIMARY KEY NOT NULL,
	"order_date" timestamp NOT NULL,
	"ship_date" timestamp NOT NULL,
	"ship_mode" text NOT NULL,
	"customer_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sales" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"discount" numeric NOT NULL,
	"profit" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"product_id" text PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"category" text NOT NULL,
	"sub_category" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_data" (
	"row_id" integer NOT NULL,
	"order_id" text NOT NULL,
	"order_date" timestamp NOT NULL,
	"ship_date" timestamp NOT NULL,
	"ship_mode" text NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"segment" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"postal_code" text NOT NULL,
	"region" text NOT NULL,
	"product_id" text NOT NULL,
	"category" text NOT NULL,
	"sub_category" text NOT NULL,
	"product_name" text NOT NULL,
	"sales" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"discount" numeric NOT NULL,
	"profit" numeric NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id") ON DELETE cascade ON UPDATE no action;