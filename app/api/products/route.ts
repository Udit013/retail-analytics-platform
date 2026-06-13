// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/index";
import { products } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Type inference from your Drizzle schema
type Product = typeof products.$inferSelect;

/**
 * GET /api/products?productId=...
 * Fetch all products or a single product by ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (productId) {
      const product = await db
        .select()
        .from(products)
        .where(eq(products.productId, productId));

      if (!product.length)
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );

      return NextResponse.json(product[0]);
    }

    const allProducts = await db.select().from(products);
    return NextResponse.json(allProducts);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(req: NextRequest) {
  try {
    const data: Product = await req.json();
    await db.insert(products).values(data);
    return NextResponse.json({ message: "Product created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products?productId=...
 * Update an existing product
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId)
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );

    const data: Partial<Product> = await req.json();
    await db
      .update(products)
      .set(data)
      .where(eq(products.productId, productId));

    return NextResponse.json({ message: "Product updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products?productId=...
 * Delete a product by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get("productId");

    if (!productId)
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      );

    await db.delete(products).where(eq(products.productId, productId));
    return NextResponse.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
