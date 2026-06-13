// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/index";
import { orders } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Type inference from your Drizzle schema
type Order = typeof orders.$inferSelect;

/**
 * GET /api/orders?orderId=...
 * Fetch all orders or a single order by ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (orderId) {
      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.orderId, orderId));

      if (!order.length)
        return NextResponse.json({ error: "Order not found" }, { status: 404 });

      return NextResponse.json(order[0]);
    }

    const allOrders = await db.select().from(orders);
    return NextResponse.json(allOrders);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(req: NextRequest) {
  try {
    const data: Order = await req.json();
    await db.insert(orders).values(data);
    return NextResponse.json({ message: "Order created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders?orderId=...
 * Update an existing order
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId)
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );

    const data: Partial<Order> = await req.json();
    await db.update(orders).set(data).where(eq(orders.orderId, orderId));

    return NextResponse.json({ message: "Order updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders?orderId=...
 * Delete an order by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("orderId");

    if (!orderId)
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );

    await db.delete(orders).where(eq(orders.orderId, orderId));
    return NextResponse.json({ message: "Order deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
