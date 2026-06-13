CREATE TABLE "sales" (
	"sales_id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"sales" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"discount" numeric NOT NULL,
	"profit" numeric NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("product_id") ON DELETE cascade ON UPDATE no action;