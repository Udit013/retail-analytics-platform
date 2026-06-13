import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// ── Core retail tables ──────────────────────────────────────────────────────

export const customers = pgTable('customers', {
  customerId: text('customer_id').primaryKey(),
  customerName: text('customer_name').notNull(),
  segment: text('segment').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  region: text('region').notNull(),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const products = pgTable('products', {
  productId: text('product_id').primaryKey(),
  productName: text('product_name').notNull(),
  category: text('category').notNull(),
  subCategory: text('sub_category').notNull(),
  brand: text('brand'),
  unitPrice: numeric('unit_price'),
  costPrice: numeric('cost_price'),
});

export const orders = pgTable('orders', {
  orderId: text('order_id').primaryKey(),
  orderDate: date('order_date').notNull(),
  shipDate: date('ship_date').notNull(),
  shipMode: text('ship_mode').notNull(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.customerId, { onDelete: 'cascade' }),
  status: text('status').default('completed'),
});

export const sales = pgTable('sales', {
  salesId: serial('sales_id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.orderId, { onDelete: 'cascade' }),
  productId: text('product_id')
    .notNull()
    .references(() => products.productId, { onDelete: 'cascade' }),
  sales: numeric('sales').notNull(),
  quantity: integer('quantity').notNull(),
  discount: numeric('discount').notNull(),
  profit: numeric('profit').notNull(),
});

// ── New tables for advanced analytics ───────────────────────────────────────

export const inventory = pgTable('inventory', {
  inventoryId: serial('inventory_id').primaryKey(),
  productId: text('product_id')
    .notNull()
    .references(() => products.productId, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull().default(0),
  reorderPoint: integer('reorder_point').notNull().default(20),
  lastRestocked: date('last_restocked'),
});

export const returns = pgTable('returns', {
  returnId: serial('return_id').primaryKey(),
  salesId: integer('sales_id')
    .notNull()
    .references(() => sales.salesId, { onDelete: 'cascade' }),
  returnDate: date('return_date').notNull(),
  reason: text('reason').notNull(),
  refundAmount: numeric('refund_amount').notNull(),
});

export const etlLogs = pgTable('etl_logs', {
  logId: serial('log_id').primaryKey(),
  filename: text('filename').notNull(),
  totalRows: integer('total_rows').notNull().default(0),
  insertedRows: integer('inserted_rows').notNull().default(0),
  errorRows: integer('error_rows').notNull().default(0),
  errors: text('errors'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const rawDataTable = pgTable('raw_data', {
  rowId: integer('row_id').notNull(),
  orderId: text('order_id').notNull(),
  orderDate: date('order_date').notNull(),
  shipDate: date('ship_date').notNull(),
  shipMode: text('ship_mode').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  segment: text('segment').notNull(),
  country: text('country').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  region: text('region').notNull(),
  productId: text('product_id').notNull(),
  category: text('category').notNull(),
  subCategory: text('sub_category').notNull(),
  productName: text('product_name').notNull(),
  sales: numeric('sales').notNull(),
  quantity: integer('quantity').notNull(),
  discount: numeric('discount').notNull(),
  profit: numeric('profit').notNull(),
});

// ── Better-auth tables ───────────────────────────────────────────────────────

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── Type inference ───────────────────────────────────────────────────────────

export type InsertCustomer = typeof customers.$inferInsert;
export type SelectCustomer = typeof customers.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type SelectProduct = typeof products.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;
export type SelectSale = typeof sales.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;
export type SelectInventory = typeof inventory.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;
export type SelectReturn = typeof returns.$inferSelect;
