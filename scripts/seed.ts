import { faker } from '@faker-js/faker';
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 5 });

// ─────────────────────────── Config ────────────────────────────
const N_CUSTOMERS = 600;
const N_PRODUCTS = 200;
const N_ORDERS = 12_000;
const MIN_ITEMS = 2;
const MAX_ITEMS = 6;
const RETURN_RATE = 0.06;
const RETURN_PROB = 0.65; // probability an order goes to a returning (vs new) customer

const START = new Date('2022-01-01');
const END = new Date('2024-12-31');

const CATEGORIES = [
  { name: 'Electronics', subs: ['Smartphones', 'Laptops', 'Tablets', 'Accessories', 'Smart Home'], priceRange: [30, 1800] as [number, number], margin: 0.22, growth: 1.6 },
  { name: 'Furniture', subs: ['Chairs', 'Desks', 'Sofas', 'Storage', 'Lighting'], priceRange: [40, 1200] as [number, number], margin: 0.38, growth: 1.0 },
  { name: 'Apparel', subs: ['Men', 'Women', 'Kids', 'Shoes', 'Accessories'], priceRange: [10, 250] as [number, number], margin: 0.55, growth: 1.2 },
  { name: 'Food & Beverage', subs: ['Snacks', 'Beverages', 'Organic', 'Supplements', 'Coffee'], priceRange: [3, 80] as [number, number], margin: 0.42, growth: 1.1 },
  { name: 'Sports & Outdoors', subs: ['Fitness', 'Camping', 'Team Sports', 'Water Sports', 'Cycling'], priceRange: [15, 600] as [number, number], margin: 0.32, growth: 1.3 },
];

const SEGMENTS = ['Consumer', 'Corporate', 'Home Office'];
const REGIONS = ['West', 'East', 'Central', 'South'];
const SHIP_MODES = ['Standard Class', 'Second Class', 'First Class', 'Same Day'];
const RETURN_REASONS = ['Defective product', 'Wrong item', 'Changed mind', 'Better price found', 'Not as described', 'Arrived late', 'Damaged in shipping'];

// Monthly seasonality multipliers (Jan..Dec) — retail builds to a Nov/Dec holiday peak.
const MONTH_MULT = [0.78, 0.80, 0.92, 0.95, 1.0, 1.0, 1.06, 1.02, 0.98, 1.12, 1.55, 1.72];
// Weekday multipliers (Sun..Sat) — weekends skew higher for consumer retail.
const DOW_MULT = [1.18, 0.95, 0.93, 0.95, 0.98, 1.08, 1.22];

function rnd(min: number, max: number) { return Math.random() * (max - min) + min; }
function rndInt(min: number, max: number) { return Math.floor(rnd(min, max + 1)); }
function pick<T>(arr: T[]): T { return arr[rndInt(0, arr.length - 1)]; }
const DAY = 86_400_000;

/** Demand intensity for a given date: trend × annual seasonality × weekday × promo spikes × noise. */
function intensity(date: Date, spanDays: number): number {
  const t = (date.getTime() - START.getTime()) / DAY;
  const trend = 0.65 + 1.15 * (t / spanDays);          // ~2.7x growth over the window
  const annual = MONTH_MULT[date.getMonth()];
  const weekday = DOW_MULT[date.getDay()];
  const m = date.getMonth();
  const d = date.getDate();
  let promo = 1;
  if (m === 10 && d >= 24 && d <= 30) promo = 2.4;       // Black Friday week
  else if (m === 11 && d >= 1 && d <= 3) promo = 1.9;     // Cyber Monday spill
  else if (m === 6 && d >= 10 && d <= 13) promo = 1.8;    // mid-year sale
  else if (m === 7 && d >= 20 && d <= 31) promo = 1.3;    // back-to-school
  const noise = rnd(0.82, 1.18);
  return trend * annual * weekday * promo * noise;
}

async function seed() {
  console.log('🌱 Seeding realistic time-structured data...');
  await sql`TRUNCATE returns, etl_logs, inventory, sales, orders, products, customers CASCADE`;
  console.log('✓ Tables cleared');

  const spanDays = Math.round((END.getTime() - START.getTime()) / DAY);

  // Precompute a weighted day distribution (cumulative) for sampling order dates.
  const days: Date[] = [];
  const cum: number[] = [];
  let acc = 0;
  for (let i = 0; i <= spanDays; i++) {
    const dt = new Date(START.getTime() + i * DAY);
    days.push(dt);
    acc += intensity(dt, spanDays);
    cum.push(acc);
  }
  const total = acc;
  const sampleDate = (): Date => {
    const r = Math.random() * total;
    let lo = 0, hi = cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    return days[lo];
  };

  // ─── Customers ─────────────────────────────────────────────
  const customerIds: string[] = [];
  const loyalty: Record<string, number> = {};
  const customerBatch = [];
  for (let i = 0; i < N_CUSTOMERS; i++) {
    const id = `CUST-${String(i + 1).padStart(5, '0')}`;
    customerIds.push(id);
    loyalty[id] = rnd(0.4, 1.8);
    customerBatch.push({
      customer_id: id, customer_name: faker.person.fullName(), segment: pick(SEGMENTS),
      country: 'United States', city: faker.location.city(), state: faker.location.state({ abbreviated: true }),
      postal_code: faker.location.zipCode(), region: pick(REGIONS), email: faker.internet.email().toLowerCase(),
    });
  }
  for (let i = 0; i < customerBatch.length; i += 200) await sql`INSERT INTO customers ${sql(customerBatch.slice(i, i + 200))}`;
  console.log(`  ✓ ${N_CUSTOMERS} customers`);

  // ─── Products ──────────────────────────────────────────────
  const productIds: string[] = [];
  const productMeta: Record<string, { price: number; margin: number; category: string; growth: number }> = {};
  const productBatch = [];
  let pIdx = 0;
  for (const cat of CATEGORIES) {
    const perCat = Math.floor(N_PRODUCTS / CATEGORIES.length);
    for (let i = 0; i < perCat; i++) {
      const id = `PROD-${String(pIdx + 1).padStart(5, '0')}`;
      const unitPrice = parseFloat(rnd(...cat.priceRange).toFixed(2));
      productIds.push(id);
      productMeta[id] = { price: unitPrice, margin: cat.margin, category: cat.name, growth: cat.growth };
      productBatch.push({
        product_id: id, product_name: `${faker.commerce.productAdjective()} ${faker.commerce.product()} ${pick(cat.subs)}`,
        category: cat.name, sub_category: pick(cat.subs), brand: faker.company.name().split(' ')[0],
        unit_price: unitPrice, cost_price: parseFloat((unitPrice * (1 - cat.margin)).toFixed(2)),
      });
      pIdx++;
    }
  }
  for (let i = 0; i < productBatch.length; i += 200) await sql`INSERT INTO products ${sql(productBatch.slice(i, i + 200))}`;
  console.log(`  ✓ ${productBatch.length} products`);

  // Category-weighted product picker that drifts over time (e.g. Electronics grows faster).
  const pickProduct = (date: Date): string => {
    const t = (date.getTime() - START.getTime()) / DAY / spanDays;
    let pid = pick(productIds);
    // Rejection sampling toward higher-growth categories later in the window.
    for (let tries = 0; tries < 3; tries++) {
      const g = productMeta[pid].growth;
      const accept = (1 + (g - 1) * t) / 1.6;
      if (Math.random() < accept) break;
      pid = pick(productIds);
    }
    return pid;
  };

  // ─── Orders + Sales (date-weighted, with cohort-style repeat behavior) ──────
  console.log(`  Generating ${N_ORDERS} orders with seasonality + cohorts...`);
  const orderDates: Date[] = Array.from({ length: N_ORDERS }, sampleDate).sort((a, b) => a.getTime() - b.getTime());

  type Active = { id: string; last: number };
  const active: Active[] = [];
  const notAcquired = [...customerIds];
  for (let i = notAcquired.length - 1; i > 0; i--) { const j = rndInt(0, i); [notAcquired[i], notAcquired[j]] = [notAcquired[j], notAcquired[i]]; }

  let salesIdCounter = 1;
  let orderSeq = 0;
  const HALFLIFE = 75 * DAY; // recency decay for retention

  for (let batch = 0; batch < orderDates.length; batch += 500) {
    const slice = orderDates.slice(batch, batch + 500);
    const ordersBatch: Record<string, unknown>[] = [];
    const salesBatch: Record<string, unknown>[] = [];

    for (const orderDate of slice) {
      const now = orderDate.getTime();
      // Choose a returning customer (recency-weighted) or acquire a new one.
      let customerId: string;
      if (active.length === 0 || (Math.random() > RETURN_PROB && notAcquired.length > 0)) {
        customerId = notAcquired.pop()!;
        active.push({ id: customerId, last: now });
      } else if (notAcquired.length === 0 && Math.random() > RETURN_PROB) {
        customerId = pick(active).id;
      } else {
        // recency × loyalty weighted pick among active customers
        let best: Active | null = null;
        let bestW = -1;
        const sampleN = Math.min(active.length, 40);
        for (let s = 0; s < sampleN; s++) {
          const cand = active[rndInt(0, active.length - 1)];
          const w = loyalty[cand.id] * Math.exp(-(now - cand.last) / HALFLIFE) * rnd(0.5, 1.5);
          if (w > bestW) { bestW = w; best = cand; }
        }
        customerId = (best ?? active[0]).id;
        (best ?? active[0]).last = now;
      }

      orderSeq++;
      const orderId = `ORD-${String(orderSeq).padStart(6, '0')}`;
      const shipDate = new Date(now + rndInt(1, 8) * DAY);
      const status = Math.random() < 0.05 ? pick(['shipped', 'returned', 'cancelled']) : 'completed';
      ordersBatch.push({
        order_id: orderId, order_date: orderDate.toISOString().slice(0, 10),
        ship_date: shipDate.toISOString().slice(0, 10), ship_mode: pick(SHIP_MODES),
        customer_id: customerId, status,
      });

      const nItems = rndInt(MIN_ITEMS, MAX_ITEMS);
      const used = new Set<string>();
      for (let j = 0; j < nItems; j++) {
        let pid = pickProduct(orderDate);
        let tries = 0;
        while (used.has(pid) && tries++ < 8) pid = pickProduct(orderDate);
        used.add(pid);
        const meta = productMeta[pid];
        const qty = rndInt(1, 7);
        const discount = pick([0, 0, 0, 0.05, 0.1, 0.15, 0.2]);
        const saleAmt = parseFloat((meta.price * qty * (1 - discount)).toFixed(2));
        // Profit from real margin, dented by the discount given.
        const profit = parseFloat((saleAmt * meta.margin - meta.price * qty * discount * 0.5).toFixed(2));
        salesBatch.push({ order_id: orderId, product_id: pid, sales: saleAmt, quantity: qty, discount: discount.toFixed(2), profit });
        salesIdCounter++;
      }
    }

    await sql`INSERT INTO orders ${sql(ordersBatch)}`;
    await sql`INSERT INTO sales ${sql(salesBatch)}`;
    process.stdout.write(`\r  Orders: ${orderSeq}/${N_ORDERS}`);
  }
  console.log(`\n  ✓ ${orderSeq} orders, ~${salesIdCounter - 1} order items, ${active.length} active customers`);

  // ─── Inventory (tie stock to product velocity so optimization later is meaningful) ──
  const velocity = await sql<{ product_id: string; units: number }[]>`
    SELECT product_id, SUM(quantity)::int AS units FROM sales GROUP BY product_id`;
  const velMap: Record<string, number> = {};
  velocity.forEach((v) => { velMap[v.product_id] = v.units; });
  const inventoryBatch = productIds.map((pid) => {
    const monthlyVel = Math.max(1, Math.round((velMap[pid] ?? 0) / 36));
    const reorder = Math.max(10, Math.round(monthlyVel * 1.5));
    // Some products understocked, some overstocked — gives the optimizer signal.
    const qty = Math.max(0, Math.round(monthlyVel * rnd(0.3, 4)));
    return { product_id: pid, quantity: qty, reorder_point: reorder, last_restocked: faker.date.between({ from: '2024-08-01', to: '2024-12-20' }).toISOString().slice(0, 10) };
  });
  for (let i = 0; i < inventoryBatch.length; i += 200) await sql`INSERT INTO inventory ${sql(inventoryBatch.slice(i, i + 200))}`;
  console.log(`  ✓ ${inventoryBatch.length} inventory records (stock tied to velocity)`);

  // ─── Returns (recent-weighted) ─────────────────────────────
  const retCount = Math.floor((salesIdCounter - 1) * RETURN_RATE);
  const retRows = await sql<{ sales_id: number; sales: string }[]>`
    SELECT s.sales_id, s.sales FROM sales s JOIN orders o ON s.order_id = o.order_id
    ORDER BY RANDOM() LIMIT ${retCount}`;
  const returnBatch = retRows.map((row) => ({
    sales_id: row.sales_id,
    return_date: faker.date.between({ from: '2022-03-01', to: '2024-12-28' }).toISOString().slice(0, 10),
    reason: pick(RETURN_REASONS),
    refund_amount: parseFloat((Number(row.sales) * rnd(0.5, 1)).toFixed(2)),
  }));
  for (let i = 0; i < returnBatch.length; i += 500) await sql`INSERT INTO returns ${sql(returnBatch.slice(i, i + 500))}`;
  console.log(`  ✓ ${returnBatch.length} returns`);

  await sql`INSERT INTO etl_logs (filename, total_rows, inserted_rows, error_rows) VALUES ('seed.ts', ${salesIdCounter - 1}, ${salesIdCounter - 1}, 0)`;
  await sql.end();
  console.log(`\n✅ Seed complete — ${N_CUSTOMERS} customers · ${productBatch.length} products · ${orderSeq} orders · ~${salesIdCounter - 1} sales · ${returnBatch.length} returns`);
}

seed().catch((e) => { console.error(e); process.exit(1); });
