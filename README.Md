# DengGuard PH 🦟📈  
_Dengue Risk Micro-Dashboard for Philippine Regions_  

available at: https://dengguard-ph.vercel.app

Week 1 project of my 3-week Data Science sprint.  
DengGuard PH is an end-to-end data science project that:

- Cleans and models **Philippine dengue case data**
- Serves a **forecast API** via FastAPI
- Visualizes trends and a simple **risk assessment dashboard** in a Next.js frontend

This marks the completion of **Week 1** and sets up the foundation for more advanced modeling and deployment work in Week 2.

---

## 🎯 Project Goals

1. Practice a full **DS → ML → API → UI** workflow.
2. Build something relevant to the **Philippine public health** context.
3. Ship a usable prototype dashboard that I can iteratively improve (better models, better infra) in later weeks.

---

## 🌏 Problem Context

Dengue is a recurring public health issue in the Philippines, with cases peaking seasonally and varying across regions.  
Timely awareness of **case trends** and **short-term risk levels** can help:

- LGUs and health officers plan ahead
- Clinicians and communities be more vigilant during high-risk periods
- Serve as a basis for more advanced decision-support tools later on

DengGuard PH focuses on:

- Visualizing **historical dengue case trends** per region
- Providing a **simple next-period forecast** and classifying risk (Low / Moderate / High)

> ⚠️ **Disclaimer:** This is a prototype for learning and portfolio purposes.  
> It is **not** a clinical or official decision-making tool.

---

## ✨ Features

- **Interactive Dashboard UI**
  - Region selector
  - Year range slider
  - Responsive line chart of dengue cases over time

- **Simple Risk Analysis**
  - “Analyze Risk” button triggers a call to the backend forecast API
  - Backend model predicts upcoming cases for the selected region
  - UI displays:
    - Forecasted cases
    - Trend classification (Increasing / Stable / Decreasing)
    - Risk level (Low / Moderate / High)
    - Natural-language summary card

- **Dataset Highlights Panel**
  - Total records in the selected slice
  - Peak week/date
  - Maximum observed cases

---

## 🧱 Tech Stack

**Data & Modeling**

- Python 3.11
- pandas, numpy
- scikit-learn (RandomForestRegressor as initial model)
- joblib (model persistence)
- Jupyter notebooks for EDA & modeling

**Backend**

- FastAPI
- Uvicorn
- Pydantic for request validation

**Frontend**

- Next.js (App Router, TypeScript)
- React
- Tailwind CSS
- lucide-react (icons)
- recharts (line chart component)

---

## 📂 Project Structure

```text
project-root/
  backend/
    core.py                # FastAPI app (forecast API + health check)
    model.joblib           # Trained dengue forecasting model
    feature_cols.joblib    # Feature column list for the model
  data/
    dengue_cases.csv       # Cleaned dengue dataset (regional, time series)
  frontend/
    app/
      page.tsx             # DengGuard PH dashboard page
      layout.tsx
      globals.css
    components/
      SimpleLineChart.tsx  # Recharts-based line chart
    public/
      data/
        dengue_timeseries.json  # Time series data for the dashboard
    package.json
    ...
  notebooks/
    01_eda.ipynb           # EDA + cleaning + CSV + JSON export
    02_model.ipynb         # Model training + evaluation + export
  README.md                # This file
  ```

##  📊 Data & Modeling
Dataset

Source: Philippine dengue case data with Region, Year/Month, and Dengue cases.

After cleaning, the canonical dataset is saved as:

data/dengue_cases.csv


Key columns:

date – First day of month (YYYY-MM-DD)

year – Year (e.g., 2017)

month – Month (1–12)

region – Region name (string)

cases – Number of dengue cases

For the dashboard, a JSON time series is exported via 01_eda.ipynb to:

frontend/public/data/dengue_timeseries.json

Model

Baseline model: RandomForestRegressor predicting next period’s cases using:

year

month

cases_lag1 (previous period’s cases per region)

Trained and evaluated in 02_model.ipynb.

Saved with joblib:

joblib.dump(model, "../backend/model.joblib")
joblib.dump(feature_cols, "../backend/feature_cols.joblib")


The backend loads these artifacts at startup and uses them inside the /forecast endpoint.

## 🧮 API Design (Backend)

Base URL (local)
http://localhost:8000

Health Check

GET /health

Response

{ "status": "ok" }

Forecast Endpoint

POST /forecast

Request body

{
  "region": "Region IV-A",
  "year": 2021,
  "month": 8,
  "cases_lag1": 1200
}


Response

{
  "region": "Region IV-A",
  "predicted_cases": 1350.42
}


The frontend then interprets predicted_cases as:

A number to display

Input to derive:

trend (increasing / stable / decreasing)

riskLevel (Low / Moderate / High)

riskColor (for the UI)

Summary text

## 🖥️ Running the Project Locally
1. Backend (FastAPI)

From the project root:

```
cd backend
# (optional but recommended) create & activate a virtual env
# conda create -n dengguard python=3.11 -y
# conda activate dengguard
pip install -r requirements.txt
```

**or manually: fastapi "uvicorn[standard]" pandas scikit-learn joblib**
```
uvicorn core:app --reload
```
````text
Backend should now be running at:

http://localhost:8000


Test in the browser:

http://localhost:8000/health

http://localhost:8000/docs (Swagger UI)

Make sure CORS is configured to allow requests from http://localhost:3000
(this is set in core.py via CORSMiddleware).
````

2. Frontend (Next.js + Vercel)

From the project root:
```
cd frontend
npm install
npm run dev
```

Frontend will run at:

http://localhost:3000


Open the root page to view the DengGuard PH dashboard.

## ☁️ Deployment Status

Frontend:

Deployed to Vercel (Next.js app).

Backend:

Currently designed to run locally for Week 1.

Structured to be deployable to a cloud environment (e.g., AWS) in Week 2.

## 🚧 Limitations & Next Steps

**Current limitations**:

- Model is relatively simple (RandomForest + few features).

- No true time-series cross-validation yet.

- Risk thresholds are heuristic and hand-tuned.

- Backend is not yet deployed to a cloud environment; dashboard calls a local API in development.

- Planned improvements (Week 2 and beyond)

- Deploy the FastAPI backend to AWS and connect the Vercel frontend to it.

- Explore more robust forecasting approaches (e.g., gradient boosting, time-series models).

- Add proper model evaluation and baseline comparisons.

- Enhance the dashboard with:

- Region comparison views

- Seasonality views (month-over-month patterns)

- Confidence bands/uncertainty visualization

## ✅ Week 1 Wrap-Up

By the end of Week 1, DengGuard PH achieves:

- ✅ A cleaned, structured dengue dataset

- ✅ A trained ML model saved as an artifact

- ✅ A FastAPI backend exposing a /forecast endpoint

- ✅ A Next.js dashboard (DengGuard PH) with:

- Interactive trend visualization

- Risk analysis button calling the live API

- Summary & dataset highlight cards
