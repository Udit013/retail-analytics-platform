import { faker } from '@faker-js/faker';
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 5 });

// ─────────────────────────── Config ────────────────────────────
const N_CUSTOMERS = 500;
const N_PRODUCTS = 200;
const N_ORDERS = 10_000;
const MIN_ITEMS = 3;
const MAX_ITEMS = 7;
const RETURN_RATE = 0.05;

const CATEGORIES = [
  {
    name: 'Electronics',
    subs: ['Smartphones', 'Laptops', 'Tablets', 'Accessories', 'Smart Home'],
    priceRange: [30, 1800] as [number, number],
    margin: 0.22,
  },
  {
    name: 'Furniture',
    subs: ['Chairs', 'Desks', 'Sofas', 'Storage', 'Lighting'],
    priceRange: [40, 1200] as [number, number],
    margin: 0.38,
  },
  {
    name: 'Apparel',
    subs: ['Men', 'Women', 'Kids', 'Shoes', 'Accessories'],
    priceRange: [10, 250] as [number, number],
    margin: 0.55,
  },
  {
    name: 'Food & Beverage',
    subs: ['Snacks', 'Beverages', 'Organic', 'Supplements', 'Coffee'],
    priceRange: [3, 80] as [number, number],
    margin: 0.42,
  },
  {
    name: 'Sports & Outdoors',
    subs: ['Fitness', 'Camping', 'Team Sports', 'Water Sports', 'Cycling'],
    priceRange: [15, 600] as [number, number],
    margin: 0.32,
  },
];

const SEGMENTS = ['Consumer', 'Corporate', 'Home Office'];
const REGIONS = ['West', 'East', 'Central', 'South'];
const SHIP_MODES = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
const ORDER_STATUSES = ['completed', 'shipped', 'returned', 'cancelled'];
const RETURN_REASONS = [
  'Defective product', 'Wrong item', 'Changed mind', 'Better price found',
  'Not as described', 'Arrived late', 'Damaged in shipping',
];

function rnd(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function rndInt(min: number, max: number) {
  return Math.floor(rnd(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[rndInt(0, arr.length - 1)];
}

// ─────────────────────────── Main ──────────────────────────────
async function seed() {
  console.log('🌱 Starting seeder...');

  // Truncate in FK-safe order
  await sql`TRUNCATE returns, etl_logs, inventory, sales, orders, products, customers CASCADE`;
  console.log('✓ Tables cleared');

  // ─── Customers ─────────────────────────────────────────────
  console.log(`  Generating ${N_CUSTOMERS} customers...`);
  const customerIds: string[] = [];
  const customerBatch = [];
  for (let i = 0; i < N_CUSTOMERS; i++) {
    const id = `CUST-${String(i + 1).padStart(5, '0')}`;
    const region = pick(REGIONS);
    const state = faker.location.state({ abbreviated: true });
    customerIds.push(id);
    customerBatch.push({
      customer_id: id,
      customer_name: faker.person.fullName(),
      segment: pick(SEGMENTS),
      country: 'United States',
      city: faker.location.city(),
      state,
      postal_code: faker.location.zipCode(),
      region,
      email: faker.internet.email().toLowerCase(),
    });
  }
  for (let i = 0; i < customerBatch.length; i += 200) {
    const chunk = customerBatch.slice(i, i + 200);
    await sql`INSERT INTO customers ${sql(chunk)}`;
  }
  console.log(`  ✓ ${N_CUSTOMERS} customers`);

  // ─── Products ──────────────────────────────────────────────
  console.log(`  Generating ${N_PRODUCTS} products...`);
  const productIds: string[] = [];
  const productPrices: Record<string, number> = {};
  const productBatch = [];
  let pIdx = 0;
  for (const cat of CATEGORIES) {
    const perCat = Math.floor(N_PRODUCTS / CATEGORIES.length);
    for (let i = 0; i < perCat; i++) {
      const id = `PROD-${String(pIdx + 1).padStart(5, '0')}`;
      const unitPrice = parseFloat(rnd(...cat.priceRange).toFixed(2));
      const costPrice = parseFloat((unitPrice * (1 - cat.margin)).toFixed(2));
      productIds.push(id);
      productPrices[id] = unitPrice;
      productBatch.push({
        product_id: id,
        product_name: `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${pick(cat.subs)}`,
        category: cat.name,
        sub_category: pick(cat.subs),
        brand: faker.company.name().split(' ')[0],
        unit_price: unitPrice,
        cost_price: costPrice,
      });
      pIdx++;
    }
  }
  for (let i = 0; i < productBatch.length; i += 200) {
    await sql`INSERT INTO products ${sql(productBatch.slice(i, i + 200))}`;
  }
  console.log(`  ✓ ${productBatch.length} products`);

  // ─── Inventory ─────────────────────────────────────────────
  const inventoryBatch = productIds.map((pid) => ({
    product_id: pid,
    quantity: rndInt(0, 500),
    reorder_point: rndInt(10, 50),
    last_restocked: faker.date.between({ from: '2024-01-01', to: '2024-12-01' }).toISOString().slice(0, 10),
  }));
  for (let i = 0; i < inventoryBatch.length; i += 200) {
    await sql`INSERT INTO inventory ${sql(inventoryBatch.slice(i, i + 200))}`;
  }
  console.log(`  ✓ ${inventoryBatch.length} inventory records`);

  // ─── Orders + Sales + Returns ──────────────────────────────
  console.log(`  Generating ${N_ORDERS} orders...`);
  const salesIdList: number[] = [];
  let salesIdCounter = 1;
  let orderCount = 0;

  for (let batch = 0; batch < N_ORDERS; batch += 500) {
    const size = Math.min(500, N_ORDERS - batch);
    const ordersBatch: Record<string, unknown>[] = [];
    const salesBatch: Record<string, unknown>[] = [];

    for (let i = 0; i < size; i++) {
      const orderId = `ORD-${String(batch + i + 1).padStart(6, '0')}`;
      const orderDate = faker.date.between({ from: '2022-01-01', to: '2024-10-31' });
      const shipDate = new Date(orderDate.getTime() + rndInt(1, 10) * 86400000);
      const customerId = pick(customerIds);
      const status = Math.random() < 0.05 ? pick(ORDER_STATUSES.slice(2)) : 'completed';

      ordersBatch.push({
        order_id: orderId,
        order_date: orderDate.toISOString().slice(0, 10),
        ship_date: shipDate.toISOString().slice(0, 10),
        ship_mode: pick(SHIP_MODES),
        customer_id: customerId,
        status,
      });

      const nItems = rndInt(MIN_ITEMS, MAX_ITEMS);
      const usedProducts = new Set<string>();
      for (let j = 0; j < nItems; j++) {
        let pid = pick(productIds);
        // avoid duplicate product per order
        let tries = 0;
        while (usedProducts.has(pid) && tries++ < 10) pid = pick(productIds);
        usedProducts.add(pid);
        const qty = rndInt(1, 8);
        const unitPrice = productPrices[pid] ?? 50;
        const discount = pick([0, 0, 0, 0.05, 0.1, 0.15, 0.2]);
        const saleAmt = parseFloat((unitPrice * qty * (1 - discount)).toFixed(2));
        const profit = parseFloat((saleAmt * rnd(0.05, 0.45)).toFixed(2));

        salesBatch.push({
          order_id: orderId,
          product_id: pid,
          sales: saleAmt,
          quantity: qty,
          discount: discount.toFixed(2),
          profit,
        });
        salesIdList.push(salesIdCounter++);
      }
    }

    await sql`INSERT INTO orders ${sql(ordersBatch)}`;
    await sql`INSERT INTO sales ${sql(salesBatch)}`;
    orderCount += size;
    process.stdout.write(`\r  Orders: ${orderCount}/${N_ORDERS}`);
  }
  console.log(`\n  ✓ ${N_ORDERS} orders, ~${salesIdCounter - 1} order items`);

  // ─── Returns ───────────────────────────────────────────────
  console.log('  Generating returns...');
  const allSaleIds = await sql<{ sales_id: number }[]>`SELECT sales_id FROM sales ORDER BY RANDOM() LIMIT ${Math.floor(salesIdCounter * RETURN_RATE)}`;
  const returnBatch = allSaleIds.map((row) => {
    const returnDate = faker.date.between({ from: '2022-06-01', to: '2024-11-30' });
    return {
      sales_id: row.sales_id,
      return_date: returnDate.toISOString().slice(0, 10),
      reason: pick(RETURN_REASONS),
      refund_amount: parseFloat(rnd(5, 500).toFixed(2)),
    };
  });
  for (let i = 0; i < returnBatch.length; i += 500) {
    await sql`INSERT INTO returns ${sql(returnBatch.slice(i, i + 500))}`;
  }
  console.log(`  ✓ ${returnBatch.length} returns`);

  // ─── ETL seed log ──────────────────────────────────────────
  await sql`INSERT INTO etl_logs (filename, total_rows, inserted_rows, error_rows) VALUES ('seed.ts', ${salesIdCounter - 1}, ${salesIdCounter - 1}, 0)`;

  await sql.end();
  console.log('\n✅ Seed complete!');
  console.log(`   ${N_CUSTOMERS} customers · ${productBatch.length} products · ${N_ORDERS} orders · ~${salesIdCounter - 1} sales · ${returnBatch.length} returns`);
}

seed().catch((e) => { console.error(e); process.exit(1); });
