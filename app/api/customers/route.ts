// app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db/index";
import { customers } from "@/src/db/schema";
import { eq } from "drizzle-orm";

// Type inference from your Drizzle schema
type Customer = typeof customers.$inferSelect;

/**
 * GET /api/customers?customerId=...
 * Fetch all customers or a single customer by ID
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");

    if (customerId) {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.customerId, customerId));

      if (!customer.length)
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );

      return NextResponse.json(customer[0]);
    }

    const allCustomers = await db.select().from(customers);
    return NextResponse.json(allCustomers);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(req: NextRequest) {
  try {
    const data: Customer = await req.json();
    await db.insert(customers).values(data);
    return NextResponse.json({ message: "Customer created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers?customerId=...
 * Update an existing customer
 */
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    if (!customerId)
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );

    const data: Partial<Customer> = await req.json();
    await db
      .update(customers)
      .set(data)
      .where(eq(customers.customerId, customerId));
    return NextResponse.json({ message: "Customer updated" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers?customerId=...
 * Delete a customer by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    if (!customerId)
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );

    await db.delete(customers).where(eq(customers.customerId, customerId));
    return NextResponse.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
