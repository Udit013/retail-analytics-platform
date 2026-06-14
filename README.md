# RetailNexa AI — Decision Intelligence Platform

Goes beyond dashboards: **data → insight → recommendation → simulation → decision**.
Forecasting, root-cause analysis, customer & inventory intelligence, scenario simulation,
and a local-AI business analyst — all on your own retail data, 100% free and open-source.

**Live:** https://retailnexa.vercel.app
**GitHub:** https://github.com/Udit013/retail-analytics-platform

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js · Recharts)               │
│  Decision Center · AI Analyst · Forecasting · Customer Intel    │
│  Inventory Optimization · Pricing/Promo Sim · Root Cause         │
│  Executive Reports (PDF) · Dashboard · ETL · CRUD Tables         │
├─────────────────────────────────────────────────────────────────┤
│                 INTELLIGENCE ENGINES (lib/intelligence)          │
│  stats · forecast (Holt-Winters) · customer (RFM/CLV/churn)     │
│  inventory (safety stock/EOQ) · pricing (elasticity)            │
│  rootcause (KPI decomposition) · decisions (synthesis)          │
├─────────────────────────────────────────────────────────────────┤
│                     API  (Route Handlers)                        │
│  /api/intelligence/{forecast,customers,inventory,pricing,        │
│      root-cause,decisions,report}                               │
│  /api/ai/analyst (Ollama)    /api/insights (Ollama+rule-based)  │
│  /api/analytics/*  /api/etl/upload  /api/export  /api/kpi/stream │
├─────────────────────────────────────────────────────────────────┤
│   DATA (Neon PostgreSQL)        AI (local Ollama)               │
│   customers·products·orders     Llama/Qwen/Mistral — no SaaS    │
│   sales·inventory·returns       Optional: Python ML (Prophet)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Decision Intelligence Features

| Feature | Description |
|---------|-------------|
| **Decision Center** | Flagship: ranked decisions synthesized from every engine, each with expected outcome + confidence |
| **AI Business Analyst** | Ask in plain English; answered by a local open-source model (Ollama) grounded in your analytics, with a deterministic fallback |
| **Forecasting** | Revenue/orders/demand/customers, 30/90/365d, Holt-Winters with seasonality, confidence intervals, model auto-selected via holdout backtest |
| **Customer Intelligence** | RFM segmentation, predicted 12-mo CLV, churn risk, VIP/win-back/upsell actions |
| **Inventory Optimization** | Stock-out & overstock risk, safety stock, reorder points, recommended order quantities, carrying cost |
| **Pricing & Promo Simulation** | Price-elasticity scenario modeling; promo impact (10%/20%/BOGO/free-ship) on revenue, profit, margin |
| **Root Cause Analysis** | Decomposes KPI change across category/region/segment + churn/returns/pricing, with confidence & recommendations |
| **Executive Reports** | Weekly/monthly/quarterly KPIs + decisions, downloadable as PDF |

Plus the analytics base: live KPI cards (SSE), revenue/AOV/product charts, cohort heatmap,
anomaly detection, ETL CSV ingest, CSV/JSON export, and CRUD tables.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) · TypeScript |
| Database | Neon PostgreSQL · Drizzle ORM |
| Charts | Recharts |
| AI | **Ollama** (local Llama/Qwen/Mistral) — no OpenAI/Gemini/paid SaaS |
| Forecasting | TypeScript stats engine · optional local Python service (Prophet/LightGBM) |
| Reports | jsPDF |
| ETL | PapaParse (CSV) |
| Styling | Tailwind CSS |
| Deploy | Vercel (free tier) |

> **100% free & open-source.** AI runs on a local Ollama model — works fully when running
> locally, and the deployed app degrades gracefully to a deterministic analyst. See
> [`ml-service/`](ml-service) for the optional Python forecasting microservice.

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
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional — local AI (free). Install Ollama + a model: `ollama pull llama3.2`
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Optional — local Python forecasting service (see ml-service/)
# ML_SERVICE_URL=http://localhost:8000
```

> No API keys required. AI features use a local Ollama model; if Ollama isn't running,
> the app falls back to deterministic insights/analyst automatically.

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

The app is fully open — no login. Every page (dashboard, ETL upload, CRUD tables) is publicly accessible.

---

## Vercel Deployment

```bash
npx vercel --prod
```

Set env vars in the Vercel dashboard (same keys as `.env`).
Set `NEXT_PUBLIC_APP_URL` to your Vercel URL.

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
