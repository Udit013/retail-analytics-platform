// app/api/sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/index";
import { sales } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Type inference from your Drizzle schema
type Sale = typeof sales.$inferSelect;
type InsertSale = typeof sales.$inferInsert;

/**
 * GET /api/sales?salesId=...
 * Fetch all sales or a single sale by ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const salesId = url.searchParams.get("salesId");

    if (salesId) {
      const sale = await db
        .select()
        .from(sales)
        .where(eq(sales.salesId, parseInt(salesId)));

      if (!sale.length)
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });

      return NextResponse.json(sale[0]);
    }

    const allSales = await db.select().from(sales);
    return NextResponse.json(allSales);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales
 * Create a new sale
 */
export async function POST(req: NextRequest) {
  try {
    const data: InsertSale = await req.json();
    await db.insert(sales).values(data);
    return NextResponse.json({ message: "Sale created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales?salesId=...
 * Update an existing sale
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const salesId = url.searchParams.get("salesId");

    if (!salesId)
      return NextResponse.json(
        { error: "salesId is required" },
        { status: 400 }
      );

    const data: Partial<Sale> = await req.json();
    await db
      .update(sales)
      .set(data)
      .where(eq(sales.salesId, parseInt(salesId)));

    return NextResponse.json({ message: "Sale updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales?salesId=...
 * Delete a sale by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const salesId = url.searchParams.get("salesId");

    if (!salesId)
      return NextResponse.json(
        { error: "salesId is required" },
        { status: 400 }
      );

    await db.delete(sales).where(eq(sales.salesId, parseInt(salesId)));
    return NextResponse.json({ message: "Sale deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
