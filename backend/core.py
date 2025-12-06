from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

from pathlib import Path

#-------------------------

app = FastAPI()

#-------------------------

REPO_ROOT = Path(__file__).resolve().parents[1]

#-------------------------

model = joblib.load(REPO_ROOT / 'backend' /'model.joblib')
feature_cols = joblib.load(REPO_ROOT / 'backend' /'feature_cols.joblib')

#-------------------------

class ForecastRequest(BaseModel):
    region: str
    year: int
    month: int
    case_lag1: float

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/forecast")
def forecast(req: ForecastRequest):
    data = pd.DataFrame([{
        "year": req.year,
        "month": req.month,
        "cases_lag1": req.cases_lag1
    }])
    preds = model.predict(data[feature_cols])
    return {
        "region": req.region,
        "predicted_cases": float(preds[0])
    }