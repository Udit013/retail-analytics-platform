# Retail Analytics Platform

Full-stack retail analytics dashboard with 50k+ rows of synthetic data, AI-powered insights, cohort analysis, anomaly detection, and real-time KPI refresh.

**Live Demo:** [https://sales-dashboard-oj09qfxim-udit-agarwals-projects-91413f51.vercel.app]
**GitHub:** https://github.com/Udit013/retail-analytics-platform

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js 16)                      │
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
│  customers (500) · products (200) · orders (10k)               │
│  sales/order_items (50k+) · inventory · returns · etl_logs      │
│  user · session · account · verification  (better-auth)         │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼─────────────────┐
     Gemini 2.0 Flash    Google OAuth          Vercel
     (AI insights)       (better-auth)         (deploy)
```

---

## Feature Table

| Feature | Description |
|---------|-------------|
| Live KPI Cards | Revenue, orders, AOV, return rate, active customers — SSE refresh every 30s |
| Revenue Trend | Line chart · day/week/month/quarter · date range picker · export CSV |
| Product Performance | Top 15 by revenue/units/return rate · category filter |
| Cohort Heatmap | Month-N retention grid (custom SVG renderer, no library) |
| AOV Charts | Monthly AOV trend + basket size distribution |
| Inventory Health | Turnover velocity, days-of-stock, low-stock alerts |
| AI Insights | Gemini 2.0 Flash weekly summary, cached 24h |
| Anomaly Detection | Z-score > 2.5σ on daily revenue with explanations |
| ETL Pipeline | CSV drag-drop · dedup · FK validation · run audit log |
| CSV/JSON Export | Any dataset downloadable from the dashboard |
| RBAC | Google OAuth · Admin: all pages · Viewer: dashboard only |
| 50k+ Rows | Seeder generates realistic synthetic data across 8 tables |

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Database | Neon PostgreSQL (free tier) |
| ORM | Drizzle ORM |
| Auth | better-auth + Google OAuth |
| Charts | Recharts |
| AI | Gemini 2.0 Flash |
| ETL | PapaParse (CSV) |
| Styling | Tailwind CSS 4 |
| Deploy | Vercel (free tier) |
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
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GEMINI_API_KEY=<from Google AI Studio — free>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database + seed
```bash
npm run db:push    # push schema to Neon
npm run seed       # 500 customers, 200 products, 10k orders, 50k+ items
```

### 4. Dev server
```bash
npm run dev        # http://localhost:3000
```

### 5. Become admin
After first sign-in, run in Neon SQL editor:
```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

### Google OAuth config
Add to your OAuth client:
- **JS origins:** `http://localhost:3000`
- **Redirect URIs:** `http://localhost:3000/api/auth/callback/google`

---

## Vercel Deployment

```bash
npx vercel --prod
```

Set env vars in Vercel dashboard (same keys as `.env`).
Update `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to your Vercel URL.
Add Vercel URL to Google OAuth authorized origins + redirect URIs.

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
