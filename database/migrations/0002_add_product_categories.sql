CREATE TYPE "public"."product_category" AS ENUM('drinks', 'food');--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" "product_category";--> statement-breakpoint
UPDATE "products" SET "category" = CASE
  WHEN "name" IN ('Café americano', 'Café de olla', 'Capuchino', 'Latte', 'Chocolate caliente', 'Té chai') THEN 'drinks'::"product_category"
  ELSE 'food'::"product_category"
END;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET NOT NULL;