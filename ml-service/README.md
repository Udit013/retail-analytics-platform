# RetailNexa ML Service (optional, local)

A small **FastAPI** microservice that runs **Prophet / LightGBM / scikit-learn** forecasting
locally — fully free and open-source. It is **optional**: the Next.js app ships with a built-in
TypeScript forecaster (Holt-Winters) and only calls this service when `ML_SERVICE_URL` is set
and reachable. The deployed (Vercel) app never depends on it.

## Run

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then in the Next.js project `.env`:

```env
ML_SERVICE_URL=http://localhost:8000
```

## Endpoints

- `GET /health` — liveness check.
- `POST /forecast` — body `{ dates[], values[], horizon, freq, confidence }`, returns Prophet
  forecast points with confidence intervals. Falls back to a seasonal-naive estimate if Prophet
  is not installed, so the endpoint always responds.

## Why separate?

Prophet/LightGBM are Python and need a long-running process — they can't run on Vercel's
serverless free tier. Keeping them in an optional local service means the live demo stays free
and always works, while you can opt into heavier ML locally.
