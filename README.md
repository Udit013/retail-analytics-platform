# Retail Analytics Platform

Full-stack retail analytics dashboard with AI-powered insights, cohort analysis, anomaly detection, and real-time KPI refresh — all running on your own sales data.

**Live:** https://retailnexa.vercel.app
**GitHub:** https://github.com/Udit013/retail-analytics-platform

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js)                          │
│  Dashboard · Revenue Chart · Cohort Heatmap · AI Insights       │
│  Product Chart · AOV Chart · Inventory Table · Anomaly Alerts   │
│  CRUD Tables (Admin) · ETL Upload (Admin) · Sign-In Page        │
├─────────────────────────────────────────────────────────────────┤
│                     API  (Route Handlers)                        │
│  /api/analytics/revenue      /api/analytics/products            │
│  /api/analytics/cohorts      /api/analytics/inventory           │
│  /api/analytics/aov          /api/analytics/anomalies           │
│  /api/insights (Gemini)      /api/kpi/stream (SSE 30s)          │
│  /api/etl/upload (CSV)       /api/export (CSV|JSON)             │
│  /api/auth/[...all]          /api/customers|products|orders     │
├─────────────────────────────────────────────────────────────────┤
│                     DATA  (Neon PostgreSQL)                      │
│  customers · products · orders · sales/order_items             │
│  inventory · returns · etl_logs                                 │
│  user · session · account · verification  (better-auth)         │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┴─────────────────┐
          Gemini (AI insights)             Vercel (deploy)
```

---

## Feature Table

| Feature | Description |
|---------|-------------|
| Live KPI Cards | Revenue, orders, AOV, return rate, active customers — SSE refresh every 30s |
| Revenue Trend | Line chart · day/week/month/quarter · date range picker · export CSV |
| Product Performance | Top products by revenue/units/return rate · category filter |
| Cohort Heatmap | Month-N retention grid (custom SVG renderer, no library) |
| AOV Charts | Monthly AOV trend + basket size distribution |
| Inventory Health | Turnover velocity, days-of-stock, low-stock alerts |
| AI Insights | Gemini-generated weekly summary, cached 24h |
| Anomaly Detection | Z-score > 2.5σ on daily revenue with explanations |
| ETL Pipeline | CSV drag-drop · dedup · FK validation · run audit log |
| CSV/JSON Export | Any dataset downloadable from the dashboard |
| RBAC | Email + password auth · Admin: all pages · Viewer: dashboard only |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Auth | better-auth (email + password, RBAC) |
| Charts | Recharts |
| AI | Gemini |
| ETL | PapaParse (CSV) |
| Styling | Tailwind CSS |
| Deploy | Vercel |
| Language | TypeScript |

---

## Database Schema

```
customers     customer_id (PK) · name · segment · city · state · region · email
products      product_id (PK)  · name · category · sub_category · unit_price · cost_price
orders        order_id (PK)    · order_date · ship_date · ship_mode · customer_id (FK)
sales         sales_id (PK)    · order_id (FK) · product_id (FK) · sales · qty · discount · profit
inventory     inventory_id (PK)· product_id (FK) · quantity · reorder_point · last_restocked
returns       return_id (PK)   · sales_id (FK) · return_date · reason · refund_amount
etl_logs      log_id (PK)      · filename · total_rows · inserted_rows · error_rows
user          id (PK)          · name · email · role (viewer|admin)
session       id (PK)          · user_id (FK) · token · expires_at
```

---

## Local Setup

### 1. Clone and install
```bash
git clone https://github.com/Udit013/retail-analytics-platform
cd retail-analytics-platform
npm install --legacy-peer-deps
```

### 2. Environment variables
Create `.env` in the project root:
```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=<random 32-byte base64>
BETTER_AUTH_URL=http://localhost:3000
GEMINI_API_KEY=<from Google AI Studio — free>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database
```bash
npm run db:push    # push schema to Neon
```

Add your own data through the **ETL upload** page (CSV) or the **CRUD tables**.
To load a batch of starter records for local development:
```bash
npm run seed       # optional: generates example rows for development
```

### 4. Dev server
```bash
npm run dev        # http://localhost:3000
```

### 5. Accounts and roles
Create an account at `/sign-up`. New accounts get the `viewer` role.
Promote a user to admin (sets a password + admin role):
```bash
npm run set-admin <email> <password>
```
Or directly in the Neon SQL editor:
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Vercel Deployment

```bash
npx vercel --prod
```

Set env vars in the Vercel dashboard (same keys as `.env`).
Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your Vercel URL.

---

## API Reference

| Endpoint | Params | Returns |
|----------|--------|---------|
| `GET /api/analytics/revenue` | `period`, `startDate`, `endDate` | Revenue by period with PoP % |
| `GET /api/analytics/products` | `sort`, `category`, `limit` | Top products |
| `GET /api/analytics/cohorts` | — | Retention matrix |
| `GET /api/analytics/inventory` | — | Stock health per product |
| `GET /api/analytics/aov` | `startDate`, `endDate` | AOV trend + distribution |
| `GET /api/analytics/anomalies` | — | Revenue outliers (z > 2.5) |
| `GET /api/insights` | — | Gemini AI weekly summary |
| `GET /api/kpi/stream` | — | SSE: live KPI JSON every 30s |
| `POST /api/etl/upload` | form-data `file` | Ingest CSV, return counts |
| `GET /api/export` | `resource`, `format`, `startDate`, `endDate` | CSV or JSON download |
