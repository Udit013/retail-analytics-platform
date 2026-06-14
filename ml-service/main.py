"""
RetailNexa AI — optional local ML forecasting microservice.

Runs Prophet / LightGBM forecasting locally (free, open-source). The Next.js app
uses its built-in TypeScript forecaster by default and only calls this service when
ML_SERVICE_URL is set and reachable — so the deployed app never depends on it.

Run locally:
    cd ml-service
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Then set ML_SERVICE_URL=http://localhost:8000 in the Next.js .env to enable it.
"""
from __future__ import annotations

from typing import List, Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="RetailNexa ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


class ForecastRequest(BaseModel):
    dates: List[str]          # ISO date strings (period starts)
    values: List[float]       # historical values aligned to dates
    horizon: int = 6          # periods to forecast
    freq: str = "MS"          # pandas frequency: D / W / MS
    confidence: float = 0.9


class ForecastPoint(BaseModel):
    date: str
    forecast: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    model: str
    points: List[ForecastPoint]
    mape: Optional[float] = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "retailnexa-ml"}


def _prophet_forecast(req: ForecastRequest) -> ForecastResponse:
    from prophet import Prophet  # imported lazily so the service starts without it

    df = pd.DataFrame({"ds": pd.to_datetime(req.dates), "y": req.values})
    m = Prophet(interval_width=req.confidence, weekly_seasonality=req.freq == "D",
                yearly_seasonality=True, daily_seasonality=False)
    m.fit(df)
    future = m.make_future_dataframe(periods=req.horizon, freq=req.freq)
    fc = m.predict(future).tail(req.horizon)
    points = [
        ForecastPoint(date=row.ds.strftime("%Y-%m-%d"),
                      forecast=max(0.0, float(row.yhat)),
                      lower=max(0.0, float(row.yhat_lower)),
                      upper=float(row.yhat_upper))
        for row in fc.itertuples()
    ]
    return ForecastResponse(model="Prophet", points=points)


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    """Forecast with Prophet; falls back to a seasonal-naive estimate if Prophet is missing."""
    try:
        return _prophet_forecast(req)
    except Exception:
        # Seasonal-naive fallback so the endpoint always responds.
        s = pd.Series(req.values, index=pd.to_datetime(req.dates))
        last = float(s.iloc[-1])
        drift = (float(s.iloc[-1]) - float(s.iloc[0])) / max(1, len(s) - 1)
        std = float(s.diff().std() or last * 0.1)
        idx = pd.date_range(s.index[-1], periods=req.horizon + 1, freq=req.freq)[1:]
        z = 1.645 if req.confidence <= 0.9 else 1.96
        points = []
        for h, d in enumerate(idx, start=1):
            yhat = max(0.0, last + drift * h)
            band = z * std * (h ** 0.5)
            points.append(ForecastPoint(date=d.strftime("%Y-%m-%d"),
                                        forecast=yhat, lower=max(0.0, yhat - band), upper=yhat + band))
        return ForecastResponse(model="Seasonal-naive (Prophet unavailable)", points=points)
